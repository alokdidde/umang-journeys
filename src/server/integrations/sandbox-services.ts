import { createHash } from "node:crypto";

export const sandboxServiceKeys = [
  "birth_certificate",
  "child_health_record",
  "vaccination_timeline",
  "child_identity",
  "eligible_benefits",
] as const;

export type SandboxServiceKey = (typeof sandboxServiceKeys)[number];

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

export function isSandboxServiceKey(value: string): value is SandboxServiceKey {
  return sandboxServiceKeys.includes(value as SandboxServiceKey);
}

export function simulateExternalService(
  journeyId: string,
  nodeKey: SandboxServiceKey,
): SandboxServiceResult {
  const suffix = createHash("sha256").update(`${journeyId}:${nodeKey}`).digest("hex").slice(0, 10).toUpperCase();
  return { ...services[nodeKey], receipt: `SBX-${suffix}` };
}
