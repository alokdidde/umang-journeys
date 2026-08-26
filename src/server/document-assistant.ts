import { proposeDocumentAction, type DocumentAnalysis } from "@/domain/document-intake";
import { isEvidenceType, type EvidenceType } from "@/domain/evidence";
import type { JourneyRepository } from "@/server/repositories/journey-repository";
import type { DocumentIntakeRepository, StoredDocumentIntake } from "@/server/repositories/document-intake-repository";

export type ProposedDocumentInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  source: "sample" | "user_upload";
  analysis: DocumentAnalysis;
};

export type AppliedDocumentResult = {
  documentId: string;
  status: "applied" | "rejected";
  journeyId: string | null;
  message: string;
};

function documentFacts(analysis: DocumentAnalysis) {
  if (analysis.kind === "vehicle_rc") return {
    "vehicle.registrationNumber": analysis.fields.registrationNumber,
    "vehicle.makeModel": analysis.fields.makeModel,
    "vehicle.chassisLast5": analysis.fields.chassisLast5,
    "vehicle.registeredOwner": analysis.fields.registeredOwner,
    "vehicle.city": analysis.fields.city,
    "vehicle.state": analysis.fields.state,
    "intake.source": "registration_certificate",
  };
  if (analysis.kind === "vaccination_receipt") return {
    "vaccination.last.vaccine": analysis.fields.vaccine,
    "vaccination.last.administeredOn": analysis.fields.administeredOn,
    "vaccination.last.provider": analysis.fields.provider,
    "vaccination.last.batchNumber": analysis.fields.batchNumber,
    "vaccination.status": "provider_receipt_recorded",
  };
  if (analysis.kind === "insurance_policy") return {
    "insurance.policyNumber": analysis.fields.policyNumber,
    "insurance.insurer": analysis.fields.insurer,
    "insurance.validUntil": analysis.fields.validUntil,
    "insurance.registrationNumber": analysis.fields.registrationNumber,
    "insurance.status": "policy_document_recorded",
  };
  if (analysis.kind === "health_insurance_policy") return {
    "person.name": analysis.fields.insuredName,
    "person.dateOfBirth": analysis.fields.dateOfBirth,
    "person.state": analysis.fields.state,
    "health.currentCover": "yes",
    "health.policyNumber": analysis.fields.policyNumber,
    "health.insurer": analysis.fields.insurer,
    "health.sumInsured": analysis.fields.sumInsured,
    "health.validUntil": analysis.fields.validUntil,
    "intake.source": "health_insurance_policy",
  };
  if (analysis.kind === "hospital_discharge_summary") return {
    "child.name": analysis.fields.childName,
    "child.dateOfBirth": analysis.fields.dateOfBirth,
    "birth.hospital": analysis.fields.provider,
    "birth.city": analysis.fields.city,
    "birth.state": analysis.fields.state,
    "birth.dischargeReference": analysis.fields.dischargeReference,
    "intake.source": "hospital_discharge_summary",
  };
  if (analysis.kind === "residence_proof") return {
    "person.name": analysis.fields.residentName,
    "move.newAddress": analysis.fields.address,
    "move.newCity": analysis.fields.city,
    "move.newState": analysis.fields.state,
    "move.occupancy": analysis.fields.residenceOccupancy,
    "intake.source": "residence_proof",
  };
  if (analysis.kind === "business_premises_proof") return {
    "business.name": analysis.fields.businessName,
    "business.address": analysis.fields.address,
    "business.city": analysis.fields.city,
    "business.state": analysis.fields.state,
    "business.occupancy": analysis.fields.businessOccupancy,
    "intake.source": "business_premises_proof",
  };
  if (analysis.kind === "retirement_account_statement") return {
    "person.name": analysis.fields.memberName,
    "retirement.accountType": analysis.fields.retirementAccountType,
    "retirement.accountReference": analysis.fields.accountReference,
    "retirement.serviceYears": analysis.fields.retirementServiceYears,
    "intake.source": "retirement_account_statement",
  };
  return {};
}

function compactFacts(facts: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(facts).filter((entry): entry is [string, string] => Boolean(entry[1])));
}

export class DocumentAssistantService {
  constructor(
    private journeys: JourneyRepository,
    private documents: DocumentIntakeRepository,
  ) {}

  async propose(sessionId: string, input: ProposedDocumentInput): Promise<StoredDocumentIntake> {
    const journeys = await this.journeys.list(sessionId);
    const baseProposal = proposeDocumentAction(input.analysis, journeys);
    const proposal = baseProposal.canApply ? baseProposal : {
      ...baseProposal,
      targetOptions: journeys.map((journey) => ({ id: journey.id, label: journey.subject.displayName, type: journey.subject.type })),
    };
    return this.documents.create(sessionId, {
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: input.bytes.byteLength,
      source: input.source,
      contentBase64: Buffer.from(input.bytes).toString("base64"),
      analysis: input.analysis,
      proposal,
    });
  }

  async apply(sessionId: string, documentId: string, approved: boolean, options?: { targetJourneyId?: string; fields?: Record<string, string> }): Promise<AppliedDocumentResult> {
    const intake = await this.documents.get(sessionId, documentId);
    if (!intake) throw Object.assign(new Error("Document proposal not found."), { code: "DOCUMENT_NOT_FOUND" });
    if (intake.status === "applied") return {
      documentId,
      status: "applied",
      journeyId: intake.appliedJourneyId,
      message: "This document was already applied.",
    };
    if (intake.status === "rejected") {
      return {
        documentId,
        status: "rejected",
        journeyId: null,
        message: "This proposal was already rejected. Nothing in My life was changed.",
      };
    }
    if (!approved) {
      await this.documents.setDecision(sessionId, documentId, "rejected");
      return { documentId, status: "rejected", journeyId: null, message: "Nothing in My life was changed." };
    }
    const manualTool = options?.targetJourneyId ? ({
      vehicle_rc: "updateVehicleFromRC",
      vaccination_receipt: "recordVaccination",
      insurance_policy: "recordVehicleInsurance",
      health_insurance_policy: "recordHealthInsurance",
      hospital_discharge_summary: "updateChildFromDischargeSummary",
      residence_proof: "updateMoveFromResidenceProof",
      business_premises_proof: "updateBusinessFromPremisesProof",
      retirement_account_statement: "updateRetirementFromStatement",
    } as const)[intake.analysis.kind as Exclude<typeof intake.analysis.kind, "unknown" | "sale_agreement">] : undefined;
    const toolName = intake.proposal.toolName ?? manualTool;
    if ((!intake.proposal.canApply && !options?.targetJourneyId) || !toolName) {
      throw Object.assign(new Error("This proposal needs review before it can be applied."), { code: "PROPOSAL_NOT_APPLICABLE" });
    }

    let journeyId = options?.targetJourneyId ?? intake.proposal.targetJourneyId;
    if (journeyId && !(await this.journeys.get(sessionId, journeyId))) throw Object.assign(new Error("Choose a person or thing from this account."), { code: "JOURNEY_NOT_FOUND" });
    const analysis = { ...intake.analysis, fields: options?.fields ?? intake.analysis.fields };
    const facts = compactFacts(documentFacts(analysis));
    if (toolName === "createVehicleJourneyFromRC") {
      const journey = await this.journeys.create(sessionId, facts, "vehicle-purchase.india.v1");
      journeyId = journey.id;
    } else if (toolName === "createChildJourneyFromDischargeSummary") {
      const journey = await this.journeys.create(sessionId, facts, "new-baby.india.v1");
      journeyId = journey.id;
    } else if (toolName === "createHealthJourneyFromPolicy") {
      const journey = await this.journeys.create(sessionId, facts, "health-insurance.india.v1");
      journeyId = journey.id;
    } else if (toolName === "createMoveJourneyFromResidenceProof") {
      const journey = await this.journeys.create(sessionId, facts, "moving-home.india.v1");
      journeyId = journey.id;
    } else if (toolName === "createBusinessJourneyFromPremisesProof") {
      const journey = await this.journeys.create(sessionId, facts, "business-setup.india.v1");
      journeyId = journey.id;
    } else if (toolName === "createRetirementJourneyFromStatement") {
      const journey = await this.journeys.create(sessionId, facts, "retirement.india.v1");
      journeyId = journey.id;
    } else if (journeyId) {
      await this.journeys.updateFacts(sessionId, journeyId, facts, { source: "document", sourceRef: documentId });
    }
    if (!journeyId) throw Object.assign(new Error("The matching person or thing is no longer available."), { code: "JOURNEY_NOT_FOUND" });

    if (!isEvidenceType(intake.analysis.kind)) throw Object.assign(new Error("This document type cannot be attached to this record."), { code: "PROPOSAL_NOT_APPLICABLE" });
    await this.journeys.addEvidence(sessionId, journeyId, {
      type: intake.analysis.kind as EvidenceType,
      fileName: intake.fileName,
      mimeType: intake.mimeType,
      size: intake.size,
      source: intake.source,
      verificationStatus: intake.analysis.confidence >= 0.9 ? "verified" : "needs_review",
      extractedFields: analysis.fields,
      analysisConfidence: intake.analysis.confidence,
      checks: [{ label: "Citizen review", status: "passed", detail: "The citizen selected the destination and approved the included values." }],
      scanStatus: "clean",
      version: 1,
      reviewedAt: new Date().toISOString(),
      contentBase64: intake.contentBase64,
    });

    if (toolName === "recordVaccination") {
      const journey = await this.journeys.get(sessionId, journeyId);
      const vaccination = journey?.projection.nodes.find((node) => node.key === "vaccination_timeline");
      if (vaccination && vaccination.status !== "completed") {
        await this.journeys.advanceService(sessionId, journeyId, "vaccination_timeline", `document:${documentId}:vaccination-review`);
      }
    }

    await this.documents.setDecision(sessionId, documentId, "applied", journeyId);
    return {
      documentId,
      status: "applied",
      journeyId,
      message: intake.proposal.toolName === "recordVaccination"
        ? "The vaccination receipt was added and the child’s timeline was refreshed."
        : intake.proposal.toolName === "recordVehicleInsurance"
          ? "The policy was added to the matching vehicle."
          : intake.proposal.toolName === "createHealthJourneyFromPolicy" || intake.proposal.toolName === "recordHealthInsurance"
            ? "The health policy was added and this person’s cover is ready for review."
          : intake.proposal.toolName === "createChildJourneyFromDischargeSummary" || intake.proposal.toolName === "updateChildFromDischargeSummary"
            ? "The hospital record was added and the child’s details are ready for review."
          : intake.proposal.toolName === "createMoveJourneyFromResidenceProof" || intake.proposal.toolName === "updateMoveFromResidenceProof"
            ? "The residence evidence was added and the new home is ready for review."
          : intake.proposal.toolName === "createBusinessJourneyFromPremisesProof" || intake.proposal.toolName === "updateBusinessFromPremisesProof"
            ? "The premises evidence was added and the business is ready for review."
          : intake.proposal.toolName === "createRetirementJourneyFromStatement" || intake.proposal.toolName === "updateRetirementFromStatement"
            ? "The statement was added and the retirement record is ready for review."
        : "The RC was attached and the vehicle is ready for review.",
    };
  }
}
