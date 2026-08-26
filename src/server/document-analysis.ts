import { generateText, Output, type LanguageModel } from "ai";
import { z } from "zod";
import type { DocumentAnalysis } from "@/domain/document-intake";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const acceptedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

const analysisSchema = z.object({
  kind: z.enum(["vehicle_rc", "sale_agreement", "vaccination_receipt", "insurance_policy", "health_insurance_policy", "hospital_discharge_summary", "residence_proof", "business_premises_proof", "retirement_account_statement", "unknown"]),
  confidence: z.number().min(0).max(1),
  fields: z.object({
    registrationNumber: z.string().optional(),
    makeModel: z.string().optional(),
    chassisLast5: z.string().optional(),
    registeredOwner: z.string().optional(),
    sellerName: z.string().optional(),
    buyerName: z.string().optional(),
    saleDate: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    childName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    vaccine: z.string().optional(),
    administeredOn: z.string().optional(),
    provider: z.string().optional(),
    batchNumber: z.string().optional(),
    policyNumber: z.string().optional(),
    insuredName: z.string().optional(),
    insurer: z.string().optional(),
    sumInsured: z.string().optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    dischargeReference: z.string().optional(),
    residentName: z.string().optional(),
    address: z.string().optional(),
    documentType: z.string().optional(),
    issuedOn: z.string().optional(),
    businessName: z.string().optional(),
    occupancy: z.string().optional(),
    memberName: z.string().optional(),
    accountType: z.string().optional(),
    accountReference: z.string().optional(),
    eligibleService: z.string().optional(),
    statementDate: z.string().optional(),
  }),
});

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
            text: `Classify this Indian citizen-service document. Extract only visibly supported fields. Return vehicle_rc, sale_agreement for a vehicle sale or delivery record, vaccination_receipt, insurance_policy for motor cover, health_insurance_policy for personal health cover, hospital_discharge_summary, residence_proof for address evidence, business_premises_proof for a commercial premises document, retirement_account_statement for EPFO/EPS/NPS records, or unknown. Dates must use YYYY-MM-DD. Never invent an identifier, person, vaccine, policy, date, provider, diagnosis, entitlement, eligibility, or confidence.${file.context ? ` The citizen added this context: "${file.context}". Use it only to understand the intended document category; do not treat it as evidence and do not extract facts unless they are visible in the document.` : ""}`,
          },
          { type: "file", mediaType: file.mimeType, data: file.bytes, filename: file.fileName },
        ],
      }],
      timeout: { totalMs: 15_000 },
    });
    return {
      kind: output.kind,
      confidence: output.confidence,
      fields: Object.fromEntries(Object.entries(output.fields).filter((entry): entry is [string, string] => Boolean(entry[1]))),
    };
  } catch (cause) {
    throw Object.assign(
      new Error("AI could not analyse that document. Please try again or upload a clearer copy."),
      { code: "AI_DOCUMENT_ANALYSIS_FAILED", cause },
    );
  }
}
