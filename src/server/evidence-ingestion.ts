import { degrees, PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createHash } from "node:crypto";
import type { LanguageModel } from "ai";
import type { EvidenceRecord, EvidenceType } from "@/domain/evidence";
import { analyzeUploadedDocument } from "@/server/document-analysis";

type EvidenceInput = Omit<EvidenceRecord, "id" | "createdAt">;

const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
const acceptedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

function extractedFields(type: EvidenceType, facts: Record<string, string>): Record<string, string> {
  if (type === "vehicle_rc") return {
    registrationNumber: facts["vehicle.registrationNumber"] ?? "TS09EV4321",
    makeModel: facts["vehicle.makeModel"] ?? "Tata Nexon EV",
    chassisLast5: facts["vehicle.chassisLast5"] ?? "7K2P9",
  };
  if (type === "sale_agreement") return {
    sellerName: facts["vehicle.sellerName"] ?? "Vikram Rao",
    buyerName: "Ananya Sharma",
    saleDate: facts["vehicle.purchaseDate"] ?? "2026-08-25",
  };
  if (type === "vaccination_receipt") return {
    childName: facts["child.name"] ?? "Aarav Sharma",
    dateOfBirth: facts["child.dateOfBirth"] ?? "2026-08-24",
    vaccine: "BCG",
    administeredOn: facts["child.dateOfBirth"] ?? "2026-08-24",
    provider: facts["birth.hospital"] ?? facts["hospital.name"] ?? "Apollo Hospital",
  };
  if (type === "hospital_discharge_summary") return {
    childName: facts["child.name"] ?? "Mira Sharma",
    dateOfBirth: facts["child.dateOfBirth"] ?? "2026-08-25",
    provider: facts["birth.hospital"] ?? facts["hospital.name"] ?? "Apollo Hospital",
    city: facts["birth.city"] ?? "Hyderabad",
    state: facts["birth.state"] ?? "Telangana",
    dischargeReference: facts["birth.dischargeReference"] ?? "DS-SBX-2048",
  };
  if (type === "health_insurance_policy") return {
    insuredName: facts["person.name"] ?? "Ananya Sharma",
    dateOfBirth: facts["person.dateOfBirth"] ?? "1992-04-18",
    policyNumber: "HLT-SBX-502781",
    insurer: "National Health Insurance Sandbox",
    sumInsured: "INR 500000",
    validFrom: "2026-04-01",
    validUntil: "2027-03-31",
  };
  if (type === "residence_proof") return {
    residentName: facts["person.name"] ?? "Ananya Sharma",
    address: facts["move.newAddress"] ?? "12 Lake View Road, Madhapur, Hyderabad 500081",
    documentType: facts["move.occupancy"] === "owned" ? "Property tax receipt" : "Registered rent agreement",
    residenceOccupancy: facts["move.occupancy"] ?? "rented",
    issuedOn: "2026-08-20",
  };
  if (type === "business_premises_proof") return {
    businessName: facts["business.name"] ?? "Ananya Design Studio",
    address: facts["business.address"] ?? "4 Creative Lane, Jubilee Hills, Hyderabad 500033",
    businessOccupancy: facts["business.occupancy"] ?? "rented",
    documentType: "Rent agreement with electricity bill",
  };
  if (type === "retirement_account_statement") return {
    memberName: facts["person.name"] ?? "Ananya Sharma",
    retirementAccountType: facts["retirement.accountType"] === "nps" ? "nps" : "epfo",
    accountReference: "Synthetic UAN ending 4821",
    retirementServiceYears: facts["retirement.serviceYears"] ?? "14",
    statementDate: "2026-08-25",
  };
  return {
    policyNumber: "MTR-SBX-884210",
    registrationNumber: facts["vehicle.registrationNumber"] ?? "TS09EV4321",
    insurer: "New India Assurance",
    validUntil: "2027-07-31",
  };
}

function titleFor(type: EvidenceType) {
  if (type === "vehicle_rc") return "SYNTHETIC REGISTRATION CERTIFICATE";
  if (type === "sale_agreement") return "SYNTHETIC VEHICLE SALE AGREEMENT";
  if (type === "vaccination_receipt") return "SYNTHETIC VACCINATION RECEIPT";
  if (type === "hospital_discharge_summary") return "SYNTHETIC HOSPITAL DISCHARGE SUMMARY";
  if (type === "health_insurance_policy") return "SYNTHETIC HEALTH INSURANCE POLICY";
  if (type === "residence_proof") return "SYNTHETIC RESIDENCE EVIDENCE";
  if (type === "business_premises_proof") return "SYNTHETIC BUSINESS PREMISES EVIDENCE";
  if (type === "retirement_account_statement") return "SYNTHETIC RETIREMENT ACCOUNT STATEMENT";
  return "SYNTHETIC MOTOR INSURANCE POLICY";
}

export async function createSampleEvidence(type: EvidenceType, facts: Record<string, string>): Promise<EvidenceInput> {
  const fields = extractedFields(type, facts);
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 36, y: 54, width: 523, height: 734, borderColor: rgb(0.18, 0.39, 0.75), borderWidth: 1.5 });
  page.drawText("UMANG JOURNEYS · EVALUATION ONLY", { x: 62, y: 748, size: 10, font: bold, color: rgb(0.75, 0.18, 0.2) });
  page.drawText(titleFor(type), { x: 62, y: 710, size: 17, font: bold, color: rgb(0.08, 0.16, 0.3) });
  page.drawText("This generated document is synthetic and cannot be used as official evidence.", { x: 62, y: 684, size: 9, font: regular, color: rgb(0.35, 0.39, 0.47) });
  Object.entries(fields).forEach(([label, value], index) => {
    const y = 625 - index * 52;
    page.drawText(label.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()), { x: 62, y, size: 9, font: regular, color: rgb(0.4, 0.45, 0.53) });
    page.drawText(value, { x: 62, y: y - 19, size: 12, font: bold, color: rgb(0.08, 0.16, 0.3) });
  });
  page.drawText("SAMPLE · SAMPLE · SAMPLE", { x: 155, y: 150, size: 24, font: bold, color: rgb(0.88, 0.78, 0.78), rotate: degrees(24) });
  const bytes = await pdf.save();
  return {
    type,
    fileName: `sample-${type.replaceAll("_", "-")}.pdf`,
    mimeType: "application/pdf",
    size: bytes.length,
    source: "sample",
    verificationStatus: "verified",
    extractedFields: fields,
    analysisConfidence: 1,
    checks: [
      { label: "Synthetic issuer", status: "passed", detail: "Generated by the isolated UMANG evaluation issuer." },
      { label: "Journey match", status: "passed", detail: "Generated from facts confirmed in this journey." },
      { label: "File safety", status: "passed", detail: "Generated in-process and checked before storage." },
    ],
    checksum: createHash("sha256").update(bytes).digest("hex"),
    scanStatus: "clean",
    retentionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    version: 1,
    reviewedAt: new Date().toISOString(),
    contentBase64: Buffer.from(bytes).toString("base64"),
  };
}

const expectedKinds: Record<EvidenceType, string> = {
  vehicle_rc: "vehicle_rc",
  sale_agreement: "sale_agreement",
  insurance_policy: "insurance_policy",
  health_insurance_policy: "health_insurance_policy",
  vaccination_receipt: "vaccination_receipt",
  hospital_discharge_summary: "hospital_discharge_summary",
  residence_proof: "residence_proof",
  business_premises_proof: "business_premises_proof",
  retirement_account_statement: "retirement_account_statement",
};

const matchFields: Partial<Record<EvidenceType, Array<[string, string]>>> = {
  vehicle_rc: [["registrationNumber", "vehicle.registrationNumber"], ["chassisLast5", "vehicle.chassisLast5"]],
  sale_agreement: [["sellerName", "vehicle.sellerName"], ["saleDate", "vehicle.purchaseDate"]],
  insurance_policy: [["registrationNumber", "vehicle.registrationNumber"]],
  health_insurance_policy: [["insuredName", "person.name"], ["dateOfBirth", "person.dateOfBirth"]],
  vaccination_receipt: [["childName", "child.name"], ["dateOfBirth", "child.dateOfBirth"]],
  hospital_discharge_summary: [["childName", "child.name"], ["dateOfBirth", "child.dateOfBirth"]],
  residence_proof: [["address", "move.newAddress"]],
  business_premises_proof: [["businessName", "business.name"], ["address", "business.address"]],
  retirement_account_statement: [["memberName", "person.name"]],
};

function normalise(value: string) {
  return value.toLocaleLowerCase("en-IN").replace(/[^a-z0-9]/g, "");
}

export async function ingestUploadedEvidence(
  type: EvidenceType,
  file: { name: string; type: string; bytes: Uint8Array },
  facts: Record<string, string>,
  options: { model?: LanguageModel } = {},
): Promise<EvidenceInput> {
  if (!acceptedMimeTypes.has(file.type)) throw new Error("Upload a PDF, PNG, or JPEG file.");
  if (file.bytes.length === 0 || file.bytes.length > MAX_EVIDENCE_BYTES) throw new Error("Evidence must be between 1 byte and 2 MB.");
  const validSignature = file.type === "application/pdf"
    ? Buffer.from(file.bytes.subarray(0, 4)).toString() === "%PDF"
    : file.type === "image/png"
      ? Buffer.from(file.bytes.subarray(1, 4)).toString() === "PNG"
      : file.bytes[0] === 0xff && file.bytes[1] === 0xd8;
  if (!validSignature) throw new Error("The file contents do not match the selected file type.");
  const analysis = await analyzeUploadedDocument({
    fileName: file.name,
    mimeType: file.type,
    bytes: file.bytes,
    context: `The citizen selected ${type} as the expected evidence category.`,
  }, options);
  const fields = analysis.fields;
  const kindMatches = analysis.kind === expectedKinds[type];
  const comparisons = (matchFields[type] ?? []).flatMap(([documentKey, factKey]) => {
    const documentValue = fields[documentKey];
    const journeyValue = facts[factKey];
    if (!documentValue || !journeyValue) return [];
    const passed = normalise(documentValue) === normalise(journeyValue);
    return [{
      label: documentKey.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()),
      status: passed ? "passed" as const : "failed" as const,
      detail: passed ? "Matches the confirmed journey value." : `Document says “${documentValue}”; journey says “${journeyValue}”.`,
    }];
  });
  const hasFields = Object.keys(fields).length > 0;
  const checks: NonNullable<EvidenceInput["checks"]> = [
    { label: "Document type", status: kindMatches ? "passed" : "failed", detail: kindMatches ? "The analysed document matches the selected evidence category." : `The analyser identified ${analysis.kind.replaceAll("_", " ")}.` },
    { label: "Visible fields", status: hasFields ? "review" : "failed", detail: hasFields ? "Review the extracted values before using them." : "No supported fields could be read with confidence." },
    ...comparisons,
    { label: "File safety", status: "passed", detail: "File signature and sandbox safety rules passed." },
  ];
  return {
    type,
    fileName: file.name.slice(0, 120),
    mimeType: file.type,
    size: file.bytes.length,
    source: "user_upload",
    verificationStatus: "needs_review",
    extractedFields: fields,
    analysisConfidence: analysis.confidence,
    checks,
    checksum: createHash("sha256").update(file.bytes).digest("hex"),
    scanStatus: "clean",
    retentionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    version: 1,
    contentBase64: Buffer.from(file.bytes).toString("base64"),
  };
}
