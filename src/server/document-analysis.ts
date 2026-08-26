import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import type { DocumentAnalysis } from "@/domain/document-intake";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const acceptedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

const text = z.string().min(1).nullable();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();

const analysisSchema = z.object({
  kind: z.enum(["vehicle_rc", "sale_agreement", "vaccination_receipt", "insurance_policy", "health_insurance_policy", "hospital_discharge_summary", "residence_proof", "business_premises_proof", "retirement_account_statement", "unknown"]),
  confidence: z.number().min(0).max(1),
  fields: z.object({
    registrationNumber: text,
    makeModel: text,
    chassisLast5: text,
    registeredOwner: text,
    sellerName: text,
    buyerName: text,
    saleDate: date,
    city: text,
    state: text,
    childName: text,
    dateOfBirth: date,
    vaccine: text,
    administeredOn: date,
    provider: text,
    batchNumber: text,
    policyNumber: text,
    insuredName: text,
    insurer: text,
    sumInsured: text,
    validFrom: date,
    validUntil: date,
    dischargeReference: text,
    residentName: text,
    address: text,
    documentType: text,
    issuedOn: date,
    businessName: text,
    residenceOccupancy: z.enum(["rented", "owned", "family"]).nullable(),
    businessOccupancy: z.enum(["rented", "owned", "consent", "shared"]).nullable(),
    memberName: text,
    retirementAccountType: z.enum(["epfo", "nps", "employer_pension", "multiple"]).nullable(),
    accountReference: text,
    retirementServiceYears: z.string().regex(/^\d{1,2}$/).nullable(),
    statementDate: date,
  }).strict(),
}).strict();

export function validateDocumentFile(file: { mimeType: string; bytes: Uint8Array }) {
  if (!acceptedMimeTypes.has(file.mimeType)) throw new Error("Upload a PDF, PNG, or JPEG document.");
  if (file.bytes.byteLength === 0 || file.bytes.byteLength > MAX_DOCUMENT_BYTES) throw new Error("Documents must be between 1 byte and 5 MB.");
  const validSignature = file.mimeType === "application/pdf"
    ? Buffer.from(file.bytes.subarray(0, 4)).toString() === "%PDF"
    : file.mimeType === "image/png"
      ? Buffer.from(file.bytes.subarray(1, 4)).toString() === "PNG"
      : file.bytes[0] === 0xff && file.bytes[1] === 0xd8;
  if (!validSignature) throw new Error("The file contents do not match the selected file type.");
}

export async function analyzeUploadedDocument(file: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  context?: string;
}, options: { model?: LanguageModel } = {}): Promise<DocumentAnalysis> {
  validateDocumentFile(file);
  if (!options.model && !process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) throw Object.assign(
    new Error("AI document analysis is unavailable because Vercel AI Gateway is not configured."),
    { code: "AI_GATEWAY_NOT_CONFIGURED" },
  );

  try {
    const { output } = await generateText({
      model: options.model ?? process.env.AI_DOCUMENT_MODEL ?? process.env.AI_INTAKE_MODEL ?? "openai/gpt-5.5",
      output: Output.object({ name: "umang_document_analysis", description: "Visible, schema-validated facts extracted from one citizen document.", schema: analysisSchema }),
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Classify this Indian citizen-service document. Extract only visibly supported fields. Return vehicle_rc, sale_agreement for a vehicle sale or delivery record, vaccination_receipt, insurance_policy for motor cover, health_insurance_policy for personal health cover, hospital_discharge_summary, residence_proof for address evidence, business_premises_proof for a commercial premises document, retirement_account_statement for EPFO/EPS/NPS records, or unknown. Every field is required by the response schema: use null when it is not visibly supported or does not apply. Dates must use YYYY-MM-DD. Normalize residenceOccupancy to rented, owned, or family; businessOccupancy to rented, owned, consent, or shared; retirementAccountType to epfo, nps, employer_pension, or multiple; and recorded service to digits-only retirementServiceYears. Never invent an identifier, person, vaccine, policy, date, provider, diagnosis, entitlement, eligibility, or confidence.${file.context ? ` The citizen added this context: "${file.context}". Use it only to understand the intended document category; do not treat it as evidence and do not extract facts unless they are visible in the document.` : ""}`,
          },
          { type: "file", mediaType: file.mimeType, data: file.bytes, filename: file.fileName },
        ],
      }],
      timeout: { totalMs: 15_000 },
    });
    return {
      kind: output.kind,
      confidence: output.confidence,
      fields: Object.fromEntries(Object.entries(output.fields).filter((entry): entry is [string, string] => entry[1] !== null)),
    };
  } catch (cause) {
    throw Object.assign(
      new Error("AI could not analyse that document. Please try again or upload a clearer copy."),
      { code: "AI_DOCUMENT_ANALYSIS_FAILED", cause },
    );
  }
}
