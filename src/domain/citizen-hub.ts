import type { DocumentKind } from "./document-intake";
import type { JourneyEvidence } from "./evidence";

type HubServiceRun = {
  status: string;
  updatedAt: string;
  artifact?: { title: string };
  events: Array<{ stageKey: string; title: string; detail: string; occurredAt: string }>;
};

export type HubJourneyInput = {
  id: string;
  subject: { type: "child" | "vehicle" | "person" | "residence" | "business"; displayName: string };
  title: string;
  createdAt: string;
  updatedAt: string;
  evidence: JourneyEvidence[];
  serviceRuns: Record<string, HubServiceRun | undefined>;
  projection?: { nodes: Array<{ key: string; title: string; status: string }> };
  facts?: Record<string, string>;
  auditLog?: Array<{ id: string; actor: string; event: string; detail: Record<string, string>; occurredAt: string }>;
};

export type HubDocumentInput = {
  id: string;
  status: "proposed" | "applied" | "rejected";
  fileName: string;
  mimeType: string;
  size: number;
  source: "sample" | "user_upload";
  analysis: { kind: DocumentKind; confidence: number; fields: Record<string, string> };
  proposal: { title: string };
  appliedJourneyId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentLibraryItem = {
  id: string;
  origin: "uploaded" | "issued";
  category: "family" | "vehicle" | "health" | "home" | "business" | "retirement" | "identity" | "benefits" | "other";
  title: string;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  status: "available" | "applied" | "needs_review" | "rejected";
  sourceLabel: string;
  journeyId: string | null;
  journeyName: string | null;
  createdAt: string;
  href: string;
  downloadHref: string | null;
};

export type ActivityItem = {
  id: string;
  type: "journey" | "document" | "service";
  title: string;
  detail: string;
  occurredAt: string;
  journeyId: string | null;
  journeyName: string | null;
  href: string | null;
};

export type CitizenTask = {
  id: string;
  title: string;
  detail: string;
  priority: "now" | "soon" | "waiting";
  dueAt: string | null;
  journeyName: string;
  href: string;
};

export type CitizenHubSnapshot = {
  documents: DocumentLibraryItem[];
  activity: ActivityItem[];
  tasks: CitizenTask[];
  summary: { uploaded: number; issued: number; needsReview: number; activity: number; tasks: number };
};

const documentTitles: Record<DocumentKind, string> = {
  vehicle_rc: "Registration certificate",
  sale_agreement: "Vehicle sale agreement",
  vaccination_receipt: "Vaccination receipt",
  insurance_policy: "Motor insurance policy",
  health_insurance_policy: "Health insurance policy",
  hospital_discharge_summary: "Hospital discharge summary",
  residence_proof: "Residence evidence",
  business_premises_proof: "Business premises evidence",
  retirement_account_statement: "Retirement account statement",
  unknown: "Uploaded document",
};

function documentCategory(kind: DocumentKind): DocumentLibraryItem["category"] {
  if (kind === "vehicle_rc" || kind === "insurance_policy") return "vehicle";
  if (kind === "health_insurance_policy") return "health";
  if (kind === "vaccination_receipt" || kind === "hospital_discharge_summary") return "family";
  if (kind === "residence_proof") return "home";
  if (kind === "business_premises_proof") return "business";
  if (kind === "retirement_account_statement") return "retirement";
  return "other";
}

function evidenceCategory(type: string): DocumentLibraryItem["category"] {
  if (["vehicle_rc", "sale_agreement", "insurance_policy"].includes(type)) return "vehicle";
  if (["vaccination_receipt", "hospital_discharge_summary"].includes(type)) return "family";
  if (type === "health_insurance_policy") return "health";
  if (type === "residence_proof") return "home";
  if (type === "business_premises_proof") return "business";
  if (type === "retirement_account_statement") return "retirement";
  return "other";
}

function serviceCategory(nodeKey: string): DocumentLibraryItem["category"] {
  if (["ownership_transfer", "insurance_cover", "fastag_setup", "compliance_calendar"].includes(nodeKey)) return "vehicle";
  if (["coverage_review", "public_scheme_check", "abha_records", "cashless_readiness"].includes(nodeKey)) return "health";
  if (["residence_evidence", "aadhaar_address", "voter_address", "move_completion_pack"].includes(nodeKey)) return "home";
  if (["business_premises", "udyam_readiness", "gst_readiness", "business_launch_pack"].includes(nodeKey)) return "business";
  if (["retirement_record_review", "pension_pathway", "life_certificate_readiness", "retirement_pack"].includes(nodeKey)) return "retirement";
  if (nodeKey === "child_identity") return "identity";
  if (nodeKey === "eligible_benefits") return "benefits";
  return "family";
}

function evidenceTitle(type: string) {
  return type.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function buildCitizenHubSnapshot(input: { journeys: HubJourneyInput[]; documents: HubDocumentInput[] }): CitizenHubSnapshot {
  const journeyById = new Map(input.journeys.map((journey) => [journey.id, journey]));
  const documents: DocumentLibraryItem[] = [];
  const activity: ActivityItem[] = [];
  const tasks: CitizenTask[] = [];
  const appliedEvidenceKeys = new Set<string>();

  for (const intake of input.documents) {
    const journey = intake.appliedJourneyId ? journeyById.get(intake.appliedJourneyId) : undefined;
    if (journey) appliedEvidenceKeys.add(`${journey.id}:${intake.fileName}:${intake.size}`);
    documents.push({
      id: `intake:${intake.id}`,
      origin: "uploaded",
      category: documentCategory(intake.analysis.kind),
      title: documentTitles[intake.analysis.kind],
      fileName: intake.fileName,
      mimeType: intake.mimeType,
      size: intake.size,
      status: intake.status === "applied" ? "applied" : intake.status === "rejected" ? "rejected" : "needs_review",
      sourceLabel: intake.source === "sample" ? "Synthetic sample" : "Uploaded by you",
      journeyId: journey?.id ?? null,
      journeyName: journey?.subject.displayName ?? null,
      createdAt: intake.createdAt,
      href: `/api/documents/${intake.id}`,
      downloadHref: `/api/documents/${intake.id}`,
    });
    activity.push({
      id: `document-created:${intake.id}`,
      type: "document",
      title: `${documentTitles[intake.analysis.kind]} added`,
      detail: intake.source === "sample" ? "Synthetic document added for evaluation." : "Document uploaded to your account.",
      occurredAt: intake.createdAt,
      journeyId: journey?.id ?? null,
      journeyName: journey?.subject.displayName ?? null,
      href: "/documents",
    });
    if (intake.status !== "proposed") activity.push({
      id: `document-decision:${intake.id}`,
      type: "document",
      title: intake.status === "applied" ? "Document update approved" : "Document update dismissed",
      detail: intake.proposal.title,
      occurredAt: intake.updatedAt,
      journeyId: journey?.id ?? null,
      journeyName: journey?.subject.displayName ?? null,
      href: journey ? `/journeys/${journey.id}` : "/documents",
    });
  }

  for (const journey of input.journeys) {
    const exceptionTasks: Array<[boolean, string, string]> = [
      [journey.facts?.["birth.route"] === "home" || journey.facts?.["birth.delayed"] === "yes", "Prepare the birth declaration", "A home or delayed birth needs an authority review and supporting declarations."],
      [journey.facts?.["vehicle.transferScope"] === "interstate", "Prepare the interstate transfer", "Check NOC, tax, re-registration, and appointment requirements for both states."],
      [journey.facts?.["vehicle.hypothecation"] === "yes" || journey.facts?.["vehicle.pendingDues"] === "yes", "Resolve the vehicle hold", "A financier record or pending dues may block the ownership transfer."],
      [journey.facts?.["health.activeClaim"] === "yes", "Reply to the insurer or hospital", "Track the current question, requested evidence, and response deadline."],
      [journey.facts?.["move.utilityAppointment"] === "yes", "Schedule the utility visit", "Choose an appointment and track the meter or connection acknowledgement."],
      [journey.facts?.["business.sectorLicence"] !== "no" && Boolean(journey.facts?.["business.sectorLicence"]), "Check activity-specific permissions", "Confirm state, municipal, and sector permissions before trading."],
      [journey.facts?.["retirement.recordDispute"] === "yes", "Reconcile the service record", "Collect employer and authority records before making a retirement claim."],
    ];
    for (const [active, title, detail] of exceptionTasks) if (active) tasks.push({ id: `exception:${journey.id}:${title}`, title, detail, priority: "now", dueAt: null, journeyName: journey.subject.displayName, href: `/journeys/${journey.id}` });
    activity.push({
      id: `journey-created:${journey.id}`,
      type: "journey",
      title: `${journey.title} journey started`,
      detail: `Journey created for ${journey.subject.displayName}.`,
      occurredAt: journey.createdAt,
      journeyId: journey.id,
      journeyName: journey.subject.displayName,
      href: `/journeys/${journey.id}`,
    });
    for (const event of journey.auditLog ?? []) {
      if (event.event === "journey_created" || event.event.startsWith("provider_case_")) continue;
      activity.push({
        id: `ledger:${event.id}`,
        type: event.actor === "document_agent" ? "document" : event.actor === "provider" ? "service" : "journey",
        title: event.event.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
        detail: Object.entries(event.detail).map(([key, value]) => `${key.replace(/([A-Z])/g, " $1")}: ${value}`).join(" · ") || "Recorded in the immutable account ledger.",
        occurredAt: event.occurredAt,
        journeyId: journey.id,
        journeyName: journey.subject.displayName,
        href: `/journeys/${journey.id}`,
      });
    }

    for (const evidence of journey.evidence) {
      const duplicateKey = `${journey.id}:${evidence.fileName}:${evidence.size}`;
      if (!appliedEvidenceKeys.has(duplicateKey)) {
        documents.push({
          id: `evidence:${journey.id}:${evidence.id}`,
          origin: "uploaded",
          category: evidenceCategory(evidence.type),
          title: evidenceTitle(evidence.type),
          fileName: evidence.fileName,
          mimeType: evidence.mimeType,
          size: evidence.size,
          status: evidence.verificationStatus === "verified" ? "applied" : evidence.verificationStatus === "rejected" ? "rejected" : "needs_review",
          sourceLabel: evidence.source === "sample" ? "Synthetic sample" : "Uploaded by you",
          journeyId: journey.id,
          journeyName: journey.subject.displayName,
          createdAt: evidence.createdAt,
          href: `/api/journeys/${journey.id}/evidence/${evidence.id}`,
          downloadHref: `/api/journeys/${journey.id}/evidence/${evidence.id}`,
        });
        activity.push({
          id: `evidence-created:${journey.id}:${evidence.id}`,
          type: "document",
          title: `${evidenceTitle(evidence.type)} added`,
          detail: `Evidence saved to ${journey.subject.displayName}.`,
          occurredAt: evidence.createdAt,
          journeyId: journey.id,
          journeyName: journey.subject.displayName,
          href: "/documents",
        });
      }
      if (evidence.verificationStatus === "needs_review") tasks.push({
        id: `review-evidence:${journey.id}:${evidence.id}`,
        title: `Review ${evidenceTitle(evidence.type)}`,
        detail: "Confirm the values read from the uploaded document before it can be used.",
        priority: "now",
        dueAt: null,
        journeyName: journey.subject.displayName,
        href: `/journeys/${journey.id}`,
      });
    }

    for (const [nodeKey, run] of Object.entries(journey.serviceRuns)) {
      if (!run) continue;
      if (run.status === "failed") tasks.push({
        id: `provider-action:${journey.id}:${nodeKey}`,
        title: "Respond to the provider",
        detail: "This synthetic case needs a clarification, correction, or appeal.",
        priority: "now",
        dueAt: null,
        journeyName: journey.subject.displayName,
        href: `/journeys/${journey.id}/services/${nodeKey}`,
      });
      for (const event of run.events) activity.push({
        id: `service-event:${journey.id}:${nodeKey}:${event.stageKey}:${event.occurredAt}`,
        type: "service",
        title: event.title,
        detail: event.detail,
        occurredAt: event.occurredAt,
        journeyId: journey.id,
        journeyName: journey.subject.displayName,
        href: `/journeys/${journey.id}/services/${nodeKey}`,
      });
      if (run.status === "completed" && run.artifact) {
        documents.push({
          id: `issued:${journey.id}:${nodeKey}`,
          origin: "issued",
          category: serviceCategory(nodeKey),
          title: run.artifact.title,
          fileName: `${nodeKey.replaceAll("_", "-")}-service-record.pdf`,
          mimeType: "application/pdf",
          size: null,
          status: "available",
          sourceLabel: "Sandbox service",
          journeyId: journey.id,
          journeyName: journey.subject.displayName,
          createdAt: run.updatedAt,
          href: `/journeys/${journey.id}/services/${nodeKey}`,
          downloadHref: `/api/journeys/${journey.id}/services/${nodeKey}/download`,
        });
        activity.push({
          id: `issued-created:${journey.id}:${nodeKey}`,
          type: "service",
          title: `${run.artifact.title} available`,
          detail: `A synthetic service record is ready for ${journey.subject.displayName}.`,
          occurredAt: run.updatedAt,
          journeyId: journey.id,
          journeyName: journey.subject.displayName,
          href: `/journeys/${journey.id}/services/${nodeKey}`,
        });
      }
    }
    if (!tasks.some((task) => task.href.startsWith(`/journeys/${journey.id}`))) {
      const next = journey.projection?.nodes.find((node) => node.status === "available" || node.status === "in_progress" || node.status === "waiting_external");
      if (next) tasks.push({
        id: `next-step:${journey.id}:${next.key}`,
        title: next.status === "waiting_external" ? `Waiting: ${next.title}` : next.title,
        detail: next.status === "waiting_external" ? "The provider simulator will update this case automatically." : "This is the next useful step in the journey.",
        priority: next.status === "waiting_external" ? "waiting" : "soon",
        dueAt: next.status === "waiting_external" ? null : new Date(Date.parse(journey.updatedAt) + 7 * 24 * 60 * 60 * 1000).toISOString(),
        journeyName: journey.subject.displayName,
        href: `/journeys/${journey.id}`,
      });
    }
  }

  documents.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  activity.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  tasks.sort((left, right) => ({ now: 0, soon: 1, waiting: 2 })[left.priority] - ({ now: 0, soon: 1, waiting: 2 })[right.priority]);
  return {
    documents,
    activity,
    tasks,
    summary: {
      uploaded: documents.filter((document) => document.origin === "uploaded").length,
      issued: documents.filter((document) => document.origin === "issued").length,
      needsReview: documents.filter((document) => document.status === "needs_review").length,
      activity: activity.length,
      tasks: tasks.length,
    },
  };
}
