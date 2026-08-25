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
  subject: { type: "child" | "vehicle"; displayName: string };
  title: string;
  createdAt: string;
  updatedAt: string;
  evidence: JourneyEvidence[];
  serviceRuns: Record<string, HubServiceRun | undefined>;
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
  category: "family" | "vehicle" | "identity" | "benefits" | "other";
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

export type CitizenHubSnapshot = {
  documents: DocumentLibraryItem[];
  activity: ActivityItem[];
  summary: { uploaded: number; issued: number; needsReview: number; activity: number };
};

const documentTitles: Record<DocumentKind, string> = {
  vehicle_rc: "Registration certificate",
  vaccination_receipt: "Vaccination receipt",
  insurance_policy: "Motor insurance policy",
  hospital_discharge_summary: "Hospital discharge summary",
  unknown: "Uploaded document",
};

function documentCategory(kind: DocumentKind): DocumentLibraryItem["category"] {
  if (kind === "vehicle_rc" || kind === "insurance_policy") return "vehicle";
  if (kind === "vaccination_receipt" || kind === "hospital_discharge_summary") return "family";
  return "other";
}

function evidenceCategory(type: string): DocumentLibraryItem["category"] {
  if (["vehicle_rc", "sale_agreement", "insurance_policy"].includes(type)) return "vehicle";
  if (["vaccination_receipt", "hospital_discharge_summary"].includes(type)) return "family";
  return "other";
}

function serviceCategory(nodeKey: string): DocumentLibraryItem["category"] {
  if (["ownership_transfer", "insurance_cover", "fastag_setup", "compliance_calendar"].includes(nodeKey)) return "vehicle";
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
    }

    for (const [nodeKey, run] of Object.entries(journey.serviceRuns)) {
      if (!run) continue;
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
          fileName: nodeKey === "birth_certificate" ? `${journey.subject.displayName}-birth-certificate.pdf` : null,
          mimeType: nodeKey === "birth_certificate" ? "application/pdf" : null,
          size: null,
          status: "available",
          sourceLabel: "Sandbox service",
          journeyId: journey.id,
          journeyName: journey.subject.displayName,
          createdAt: run.updatedAt,
          href: `/journeys/${journey.id}/services/${nodeKey}`,
          downloadHref: nodeKey === "birth_certificate" ? `/api/journeys/${journey.id}/certificate` : null,
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
  }

  documents.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  activity.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
  return {
    documents,
    activity,
    summary: {
      uploaded: documents.filter((document) => document.origin === "uploaded").length,
      issued: documents.filter((document) => document.origin === "issued").length,
      needsReview: documents.filter((document) => document.status === "needs_review").length,
      activity: activity.length,
    },
  };
}
