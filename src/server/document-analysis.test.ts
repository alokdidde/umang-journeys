import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("keeps filename-only classification below the approval threshold", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");

    const result = await analyzeUploadedDocument({
      fileName: "vaccination-receipt.pdf",
      mimeType: "application/pdf",
      bytes: new Uint8Array(Buffer.from("%PDF synthetic")),
    });

    expect(result).toEqual({ kind: "vaccination_receipt", confidence: 0.55, fields: {} });
  });
});
