export const evidenceTypes = ["vehicle_rc", "sale_agreement", "insurance_policy"] as const;

export type EvidenceType = (typeof evidenceTypes)[number];
export type EvidenceSource = "user_upload" | "sample";

export type JourneyEvidence = {
  id: string;
  type: EvidenceType;
  fileName: string;
  mimeType: string;
  size: number;
  source: EvidenceSource;
  verificationStatus: "verified" | "needs_review" | "rejected";
  extractedFields: Record<string, string>;
  createdAt: string;
};

export type EvidenceRecord = JourneyEvidence & { contentBase64: string };

export function isEvidenceType(value: string): value is EvidenceType {
  return evidenceTypes.includes(value as EvidenceType);
}

export const evidenceLabels: Record<EvidenceType, { title: string; description: string }> = {
  vehicle_rc: { title: "Registration certificate (RC)", description: "The vehicle number and chassis suffix must be readable." },
  sale_agreement: { title: "Sale agreement or delivery note", description: "It should identify the buyer, seller, vehicle and sale date." },
  insurance_policy: { title: "Motor insurance policy", description: "The vehicle number, policy number and validity dates must be readable." },
};

export const serviceEvidenceRequirements: Partial<Record<string, EvidenceType[]>> = {
  ownership_transfer: ["vehicle_rc", "sale_agreement"],
  insurance_cover: ["insurance_policy"],
};

export function missingEvidence(nodeKey: string, evidence: JourneyEvidence[]) {
  return (serviceEvidenceRequirements[nodeKey] ?? []).filter(
    (type) => !evidence.some((item) => item.type === type && item.verificationStatus === "verified"),
  );
}
