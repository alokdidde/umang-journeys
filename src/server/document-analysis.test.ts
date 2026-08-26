import { afterEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { analyzeUploadedDocument, validateDocumentFile } from "./document-analysis";

afterEach(() => vi.unstubAllEnvs());

describe("document analysis boundary", () => {
  it("accepts supported files only when their signatures match", () => {
    expect(() => validateDocumentFile({
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic")),
    })).not.toThrow();
    expect(() => validateDocumentFile({
      mimeType: "image/png",
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
    })).not.toThrow();
    expect(() => validateDocumentFile({
      mimeType: "image/jpeg",
      bytes: new Uint8Array([0xff, 0xd8, 0xff]),
    })).not.toThrow();
    expect(() => validateDocumentFile({
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("not a PDF")),
    })).toThrow("The file contents do not match the selected file type.");
  });

  it("fails explicitly when Vercel AI Gateway authentication is unavailable", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");

    await expect(analyzeUploadedDocument({
      fileName: "vaccination-receipt.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic")),
      context: "This is for Aarav and was given yesterday.",
    })).rejects.toMatchObject({
      code: "AI_GATEWAY_NOT_CONFIGURED",
      message: "AI document analysis is unavailable because Vercel AI Gateway is not configured.",
    });
  });

  it("returns schema-validated fields from Vercel AI SDK document analysis", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: JSON.stringify({
          kind: "vaccination_receipt",
          confidence: 0.96,
          fields: { childName: "Aarav Sharma", vaccine: "BCG", administeredOn: "2026-08-25" },
        }) }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 60, noCache: 60, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 30, text: 30, reasoning: 0 },
        },
        warnings: [],
      },
    });

    await expect(analyzeUploadedDocument({
      fileName: "scan.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic")),
    }, { model })).resolves.toEqual({
      kind: "vaccination_receipt",
      confidence: 0.96,
      fields: { childName: "Aarav Sharma", vaccine: "BCG", administeredOn: "2026-08-25" },
    });
  });

  it("surfaces invalid AI document output instead of classifying by filename", async () => {
    const model = new MockLanguageModelV3({
      doGenerate: {
        content: [{ type: "text", text: "vaccination receipt" }],
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 2, text: 2, reasoning: 0 },
        },
        warnings: [],
      },
    });

    await expect(analyzeUploadedDocument({
      fileName: "vaccination-receipt.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic")),
    }, { model })).rejects.toMatchObject({
      code: "AI_DOCUMENT_ANALYSIS_FAILED",
      message: "AI could not analyse that document. Please try again or upload a clearer copy.",
    });
  });
});
