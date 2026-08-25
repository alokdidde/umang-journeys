import { createHash } from "node:crypto";
import {
  serviceWorkflowDefinitions,
  type SandboxServiceKey,
  type SandboxServiceRun,
  type ServiceArtifact,
} from "@/domain/service-workflows";

export { isSandboxServiceKey } from "@/domain/service-workflows";

export type SandboxServiceResult = {
  adapterKey: string;
  actionType: string;
  receipt: string;
  summary: string;
};

const services: Record<SandboxServiceKey, Omit<SandboxServiceResult, "receipt">> = {
  birth_certificate: {
    adapterKey: "sandbox-civil-registry",
    actionType: "issue_birth_certificate",
    summary: "A watermarked birth certificate is ready to download.",
  },
  child_health_record: {
    adapterKey: "sandbox-abdm",
    actionType: "create_child_health_record",
    summary: "A synthetic child health record was created with a private health ID.",
  },
  vaccination_timeline: {
    adapterKey: "sandbox-uwin",
    actionType: "build_vaccination_timeline",
    summary: "An age-based vaccination timeline was generated with upcoming reminders.",
  },
  child_identity: {
    adapterKey: "sandbox-identity-guidance",
    actionType: "prepare_identity_checklist",
    summary: "An identity-document checklist was prepared; no identity application was filed.",
  },
  eligible_benefits: {
    adapterKey: "sandbox-benefit-exchange",
    actionType: "match_family_benefits",
    summary: "Potential family benefits were matched for review; eligibility is not guaranteed.",
  },
};

export function simulateExternalService(
  journeyId: string,
  nodeKey: SandboxServiceKey,
): SandboxServiceResult {
  const suffix = createHash("sha256").update(`${journeyId}:${nodeKey}`).digest("hex").slice(0, 10).toUpperCase();
  return { ...services[nodeKey], receipt: `SBX-${suffix}` };
}

function numericReference(journeyId: string, nodeKey: SandboxServiceKey) {
  const hex = createHash("sha256").update(`${journeyId}:${nodeKey}:number`).digest("hex").slice(0, 14);
  return (BigInt(`0x${hex}`) % 100_000_000_000_000n).toString().padStart(14, "0");
}

function createArtifact(journeyId: string, nodeKey: SandboxServiceKey, receipt: string): ServiceArtifact {
  const reference = numericReference(journeyId, nodeKey);
  switch (nodeKey) {
    case "birth_certificate":
      return {
        title: "Sandbox birth certificate",
        subtitle: "Issued and digitally signed in the civil registry simulation",
        referenceLabel: "Certificate reference",
        referenceValue: `CRS-${reference.slice(0, 4)}-${reference.slice(4, 10)}`,
        facts: [
          { label: "Registration match", value: "Verified", status: "verified" },
          { label: "Authority", value: "Greater Hyderabad sandbox", status: "information" },
          { label: "Document integrity", value: "Sandbox signature valid", status: "verified" },
        ],
        groups: [{ title: "Available document", items: [{ title: "Birth certificate PDF", meta: "Watermarked · Not official", detail: `Receipt ${receipt}`, status: "ready" }] }],
        notice: "This certificate is generated only for evaluation and cannot be used as proof of identity.",
      };
    case "child_health_record":
      return {
        title: "Child health profile",
        subtitle: "A consent-aware sandbox record prepared for future care documents",
        referenceLabel: "Sandbox ABHA number",
        referenceValue: `${reference.slice(0, 2)}-${reference.slice(2, 6)}-${reference.slice(6, 10)}-${reference.slice(10)}`,
        facts: [
          { label: "Guardian relationship", value: "Recorded for simulation", status: "verified" },
          { label: "Birth summary", value: "Linked from hospital record", status: "verified" },
          { label: "Consent", value: "Evaluation-only consent", status: "information" },
        ],
        groups: [{
          title: "Record sections",
          description: "No clinical finding or immunisation is inferred from the birth registration.",
          items: [
            { title: "Newborn profile", meta: "Name, birth date, guardian", status: "ready" },
            { title: "Birth summary", meta: "Apollo Hospital · synthetic", status: "ready" },
            { title: "Immunisation records", meta: "Waiting for a provider record", status: "review" },
          ],
        }],
        notice: "ABDM facilitates consent-based record exchange; this simulation does not create an ABHA or store a real medical record.",
      };
    case "vaccination_timeline":
      return {
        title: "Vaccination timeline",
        subtitle: "Calculated from the recorded birth date of 24 August 2026",
        referenceLabel: "Schedule reference",
        referenceValue: `UWIN-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "Schedule anchor", value: "24 August 2026", status: "verified" },
          { label: "Birth doses", value: "Administration not confirmed", status: "review" },
          { label: "Reminder channel", value: "Not configured", status: "information" },
        ],
        groups: [{
          title: "Upcoming milestones",
          description: "Confirm the exact vaccine and dose with a qualified health provider.",
          items: [
            { title: "Birth-dose review", meta: "BCG · OPV-0 · Hepatitis B birth dose", detail: "Ask the birth facility to confirm what was administered.", status: "due" },
            { title: "6-week visit", meta: "Due 5 October 2026", detail: "First primary-series milestone", status: "upcoming" },
            { title: "10-week visit", meta: "Due 2 November 2026", detail: "Second primary-series milestone", status: "upcoming" },
            { title: "14-week visit", meta: "Due 30 November 2026", detail: "Third primary-series milestone", status: "upcoming" },
          ],
        }],
        notice: "This is planning guidance, not a clinical record. Only a vaccination provider can confirm doses and medical suitability.",
      };
    case "child_identity":
      return {
        title: "Newborn identity checklist",
        subtitle: "Prepared for an under-five Aadhaar enrolment centre visit",
        referenceLabel: "Checklist reference",
        referenceValue: `UIDAI-GUIDE-${reference.slice(-7)}`,
        facts: [
          { label: "Child age band", value: "Below 5 years", status: "verified" },
          { label: "Birth certificate", value: "Sandbox copy available", status: "ready" },
          { label: "Submission", value: "No application filed", status: "information" },
        ],
        groups: [{
          title: "Centre-visit checklist",
          items: [
            { title: "Child’s official birth certificate", meta: "Bring the government-issued original", status: "review" },
            { title: "Parent or guardian Aadhaar", meta: "Required for authentication and relationship", status: "review" },
            { title: "Child photograph", meta: "Captured at the enrolment centre", status: "information" },
            { title: "Biometric update reminder", meta: "Fingerprint and iris update after age 5", status: "upcoming" },
          ],
        }],
        notice: "For children below five, UIDAI requires a centre visit and guardian authentication. This checklist does not reserve an appointment.",
      };
    case "eligible_benefits":
      return {
        title: "Family benefit matches",
        subtitle: "Explainable suggestions based on Telangana and the facts currently available",
        referenceLabel: "Screening reference",
        referenceValue: `BEN-SBX-${reference.slice(-8)}`,
        facts: [
          { label: "State", value: "Telangana", status: "verified" },
          { label: "Hospital type", value: "Needs confirmation", status: "review" },
          { label: "Eligibility decision", value: "Not made", status: "information" },
        ],
        groups: [{
          title: "Potential programmes",
          description: "Matches are ordered by relevance, not guaranteed eligibility.",
          items: [
            { title: "Arogya Lakshmi", meta: "Potential nutrition-support match", detail: "Confirm lactating-mother enrolment with the local Anganwadi centre.", status: "ready" },
            { title: "KCR Kit / Amma Odi", meta: "Hospital-type evidence needed", detail: "The programme is associated with qualifying government-facility deliveries; confirm the recorded facility type.", status: "review" },
            { title: "PMMVY", meta: "Not currently shown for Telangana", detail: "The central programme’s official FAQ says Telangana implements its own maternity benefit scheme.", status: "information" },
          ],
        }],
        notice: "A department or authorised field worker must confirm eligibility and required documents before any application.",
      };
  }
}

export function advanceSimulatedService(
  journeyId: string,
  nodeKey: SandboxServiceKey,
  current: SandboxServiceRun | undefined,
  now = new Date(),
): SandboxServiceRun {
  if (current?.status === "completed") return current;
  const definition = serviceWorkflowDefinitions[nodeKey];
  const nextStageNumber = Math.min((current?.currentStage ?? 0) + 1, definition.stages.length);
  const stage = definition.stages[nextStageNumber - 1];
  const occurredAt = now.toISOString();
  const receipt = current?.receipt ?? simulateExternalService(journeyId, nodeKey).receipt;
  const run: SandboxServiceRun = {
    runId: current?.runId ?? `RUN-${receipt.slice(4)}`,
    nodeKey,
    provider: definition.agency,
    status: stage.state,
    progress: stage.progress,
    currentStage: nextStageNumber,
    startedAt: current?.startedAt ?? occurredAt,
    updatedAt: occurredAt,
    completedAt: stage.state === "completed" ? occurredAt : undefined,
    receipt,
    events: [...(current?.events ?? []), { stageKey: stage.key, title: stage.title, detail: stage.detail, occurredAt }],
  };
  if (stage.state === "completed") run.artifact = createArtifact(journeyId, nodeKey, receipt);
  return run;
}
