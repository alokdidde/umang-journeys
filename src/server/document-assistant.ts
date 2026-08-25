import { proposeDocumentAction, type DocumentAnalysis } from "@/domain/document-intake";
import type { EvidenceType } from "@/domain/evidence";
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
    "vehicle.purchaseType": "used",
    "vehicle.city": analysis.fields.city || "Hyderabad",
    "vehicle.state": analysis.fields.state || "Telangana",
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
    "person.state": analysis.fields.state || "Telangana",
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
    "move.occupancy": analysis.fields.documentType?.toLocaleLowerCase("en-IN").includes("property") ? "owned" : "rented",
    "intake.source": "residence_proof",
  };
  if (analysis.kind === "business_premises_proof") return {
    "business.name": analysis.fields.businessName,
    "business.address": analysis.fields.address,
    "business.city": analysis.fields.city,
    "business.state": analysis.fields.state,
    "business.occupancy": analysis.fields.occupancy?.toLocaleLowerCase("en-IN").includes("rent") ? "rented" : analysis.fields.occupancy?.toLocaleLowerCase("en-IN").includes("own") ? "owned" : "consent",
    "intake.source": "business_premises_proof",
  };
  if (analysis.kind === "retirement_account_statement") return {
    "person.name": analysis.fields.memberName,
    "retirement.accountType": analysis.fields.accountType?.toLocaleLowerCase("en-IN").includes("nps") ? "nps" : analysis.fields.accountType?.toLocaleLowerCase("en-IN").match(/epfo|eps/) ? "epfo" : "not_sure",
    "retirement.accountReference": analysis.fields.accountReference,
    "retirement.serviceYears": analysis.fields.eligibleService?.match(/\d+/)?.[0],
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
    const proposal = proposeDocumentAction(input.analysis, journeys);
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

  async apply(sessionId: string, documentId: string, approved: boolean): Promise<AppliedDocumentResult> {
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
        message: "This proposal was already rejected. No journey data was changed.",
      };
    }
    if (!approved) {
      await this.documents.setDecision(sessionId, documentId, "rejected");
      return { documentId, status: "rejected", journeyId: null, message: "No journey data was changed." };
    }
    if (!intake.proposal.canApply || !intake.proposal.toolName) {
      throw Object.assign(new Error("This proposal needs review before it can be applied."), { code: "PROPOSAL_NOT_APPLICABLE" });
    }

    let journeyId = intake.proposal.targetJourneyId;
    const facts = compactFacts(documentFacts(intake.analysis));
    if (intake.proposal.toolName === "createVehicleJourneyFromRC") {
      const journey = await this.journeys.create(sessionId, facts, "vehicle-purchase.india.v1");
      journeyId = journey.id;
    } else if (intake.proposal.toolName === "createChildJourneyFromDischargeSummary") {
      const journey = await this.journeys.create(sessionId, facts, "new-baby.india.v1");
      journeyId = journey.id;
    } else if (intake.proposal.toolName === "createHealthJourneyFromPolicy") {
      const journey = await this.journeys.create(sessionId, facts, "health-insurance.india.v1");
      journeyId = journey.id;
    } else if (intake.proposal.toolName === "createMoveJourneyFromResidenceProof") {
      const journey = await this.journeys.create(sessionId, facts, "moving-home.india.v1");
      journeyId = journey.id;
    } else if (intake.proposal.toolName === "createBusinessJourneyFromPremisesProof") {
      const journey = await this.journeys.create(sessionId, facts, "business-setup.india.v1");
      journeyId = journey.id;
    } else if (intake.proposal.toolName === "createRetirementJourneyFromStatement") {
      const journey = await this.journeys.create(sessionId, facts, "retirement.india.v1");
      journeyId = journey.id;
    } else if (journeyId) {
      await this.journeys.updateFacts(sessionId, journeyId, facts);
    }
    if (!journeyId) throw Object.assign(new Error("The matching journey is no longer available."), { code: "JOURNEY_NOT_FOUND" });

    await this.journeys.addEvidence(sessionId, journeyId, {
      type: intake.analysis.kind as EvidenceType,
      fileName: intake.fileName,
      mimeType: intake.mimeType,
      size: intake.size,
      source: intake.source,
      verificationStatus: intake.analysis.confidence >= 0.9 ? "verified" : "needs_review",
      extractedFields: intake.analysis.fields,
      contentBase64: intake.contentBase64,
    });

    if (intake.proposal.toolName === "recordVaccination") {
      const journey = await this.journeys.get(sessionId, journeyId);
      const vaccination = journey?.projection.nodes.find((node) => node.key === "vaccination_timeline");
      if (vaccination && vaccination.status !== "locked" && vaccination.status !== "completed") {
        for (let stage = 1; stage <= 4; stage += 1) {
          await this.journeys.advanceService(sessionId, journeyId, "vaccination_timeline", `document:${documentId}:vaccination:${stage}`);
        }
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
          ? "The policy was added to the matching vehicle journey."
          : intake.proposal.toolName === "createHealthJourneyFromPolicy" || intake.proposal.toolName === "recordHealthInsurance"
            ? "The health policy was added and the health journey is ready for review."
          : intake.proposal.toolName === "createChildJourneyFromDischargeSummary" || intake.proposal.toolName === "updateChildFromDischargeSummary"
            ? "The hospital record was added and the child journey was pre-filled for review."
          : intake.proposal.toolName === "createMoveJourneyFromResidenceProof" || intake.proposal.toolName === "updateMoveFromResidenceProof"
            ? "The residence evidence was added and the moving-home journey is ready for review."
          : intake.proposal.toolName === "createBusinessJourneyFromPremisesProof" || intake.proposal.toolName === "updateBusinessFromPremisesProof"
            ? "The premises evidence was added and the business journey is ready for review."
          : intake.proposal.toolName === "createRetirementJourneyFromStatement" || intake.proposal.toolName === "updateRetirementFromStatement"
            ? "The statement was added and the retirement journey is ready for review."
        : "The RC was attached and the vehicle journey is ready for review.",
    };
  }
}
