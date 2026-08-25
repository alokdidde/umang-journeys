import { degrees, PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { EvidenceRecord, EvidenceType } from "@/domain/evidence";

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
  return {
    policyNumber: "MTR-SBX-884210",
    registrationNumber: facts["vehicle.registrationNumber"] ?? "TS09EV4321",
    validUntil: "2027-07-31",
  };
}

function titleFor(type: EvidenceType) {
  if (type === "vehicle_rc") return "SYNTHETIC REGISTRATION CERTIFICATE";
  if (type === "sale_agreement") return "SYNTHETIC VEHICLE SALE AGREEMENT";
  if (type === "vaccination_receipt") return "SYNTHETIC VACCINATION RECEIPT";
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
    contentBase64: Buffer.from(bytes).toString("base64"),
  };
}

export function ingestUploadedEvidence(
  type: EvidenceType,
  file: { name: string; type: string; bytes: Uint8Array },
  facts: Record<string, string>,
): EvidenceInput {
  if (!acceptedMimeTypes.has(file.type)) throw new Error("Upload a PDF, PNG, or JPEG file.");
  if (file.bytes.length === 0 || file.bytes.length > MAX_EVIDENCE_BYTES) throw new Error("Evidence must be between 1 byte and 2 MB.");
  const validSignature = file.type === "application/pdf"
    ? Buffer.from(file.bytes.subarray(0, 4)).toString() === "%PDF"
    : file.type === "image/png"
      ? Buffer.from(file.bytes.subarray(1, 4)).toString() === "PNG"
      : file.bytes[0] === 0xff && file.bytes[1] === 0xd8;
  if (!validSignature) throw new Error("The file contents do not match the selected file type.");
  return {
    type,
    fileName: file.name.slice(0, 120),
    mimeType: file.type,
    size: file.bytes.length,
    source: "user_upload",
    verificationStatus: "verified",
    extractedFields: extractedFields(type, facts),
    contentBase64: Buffer.from(file.bytes).toString("base64"),
  };
}
