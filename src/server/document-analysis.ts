import { generateText, Output } from "ai";
import { z } from "zod";
import type { DocumentAnalysis, DocumentKind } from "@/domain/document-intake";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const acceptedMimeTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);

const analysisSchema = z.object({
  kind: z.enum(["vehicle_rc", "vaccination_receipt", "insurance_policy", "hospital_discharge_summary", "unknown"]),
  confidence: z.number().min(0).max(1),
  fields: z.object({
    registrationNumber: z.string().optional(),
    makeModel: z.string().optional(),
    chassisLast5: z.string().optional(),
    registeredOwner: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    childName: z.string().optional(),
    dateOfBirth: z.string().optional(),
    vaccine: z.string().optional(),
    administeredOn: z.string().optional(),
    provider: z.string().optional(),
    batchNumber: z.string().optional(),
    policyNumber: z.string().optional(),
    insurer: z.string().optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
    dischargeReference: z.string().optional(),
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

function filenameFallback(fileName: string): DocumentAnalysis {
  const normalized = fileName.toLowerCase();
  const kind: DocumentKind = /discharge|hospital-summary|birth-summary/.test(normalized)
    ? "hospital_discharge_summary"
    : /insurance|policy|motor-cover/.test(normalized)
      ? "insurance_policy"
      : /vacc|immun|bcg|dose/.test(normalized)
    ? "vaccination_receipt"
    : /(^|[-_ ])rc($|[-_. ])|registration/.test(normalized)
      ? "vehicle_rc"
      : "unknown";
  return { kind, confidence: kind === "unknown" ? 0.2 : 0.55, fields: {} };
}

export async function analyzeUploadedDocument(file: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<DocumentAnalysis> {
  validateDocumentFile(file);
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) return filenameFallback(file.fileName);

  try {
    const { output } = await generateText({
      model: process.env.AI_DOCUMENT_MODEL ?? process.env.AI_INTAKE_MODEL ?? "openai/gpt-5.5",
      output: Output.object({ schema: analysisSchema }),
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "Classify this Indian citizen-service document. Extract only visibly supported fields. Return vehicle_rc, vaccination_receipt, insurance_policy, hospital_discharge_summary, or unknown. Dates must use YYYY-MM-DD. Never invent an identifier, person, vaccine, policy, date, provider, or confidence.",
          },
          { type: "file", mediaType: file.mimeType, data: file.bytes, filename: file.fileName },
        ],
      }],
      timeout: { totalMs: 15_000 },
    });
    if (!output) return filenameFallback(file.fileName);
    return {
      kind: output.kind,
      confidence: output.confidence,
      fields: Object.fromEntries(Object.entries(output.fields).filter((entry): entry is [string, string] => Boolean(entry[1]))),
    };
  } catch {
    return filenameFallback(file.fileName);
  }
}
