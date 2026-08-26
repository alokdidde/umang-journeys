import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDemoSession: vi.fn(),
  analyzeUploadedDocument: vi.fn(),
  propose: vi.fn(),
  list: vi.fn(),
}));

vi.mock("@/server/session", () => ({ getDemoSession: mocks.getDemoSession }));
vi.mock("@/server/document-analysis", () => ({ analyzeUploadedDocument: mocks.analyzeUploadedDocument }));
vi.mock("@/server/document-assistant-instance", () => ({ documentAssistant: { propose: mocks.propose } }));
vi.mock("@/server/repositories/journey-repository", () => ({ journeyRepository: { list: mocks.list } }));

import { POST } from "./route";

class TestFile {
  name = "policy.pdf";
  type = "application/pdf";
  async arrayBuffer() { return Uint8Array.from(Buffer.from("%PDF-1.4\n%%EOF")).buffer; }
}

function uploadRequest(fields: Record<string, unknown> = {}) {
  const form = { get: (key: string) => key === "file" ? new TestFile() : fields[key] ?? null };
  return { formData: async () => form } as unknown as Request;
}

describe("POST /api/assistant/documents", () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("File", TestFile);
    mocks.getDemoSession.mockResolvedValue("demo-session");
  });

  it("does not persist a proposal when Vercel AI analysis fails", async () => {
    mocks.analyzeUploadedDocument.mockRejectedValue(Object.assign(new Error("AI could not analyse that document. Please try again or upload a clearer copy."), {
      code: "AI_DOCUMENT_ANALYSIS_FAILED",
    }));

    const response = await POST(uploadRequest());
    const body = await response.json();

    expect({ status: response.status, body }).toMatchObject({ status: 503, body: { code: "DOCUMENT_ANALYSIS_FAILED" } });
    expect(mocks.propose).not.toHaveBeenCalled();
  });

  it("rejects an AI-classified document that does not belong to the selected journey", async () => {
    mocks.analyzeUploadedDocument.mockResolvedValue({
      kind: "health_insurance_policy",
      confidence: 0.96,
      fields: { policyNumber: "SYN-HEALTH-2026" },
    });

    const response = await POST(uploadRequest({ expectedKind: "vehicle_rc", context: "This is for the Buying a Vehicle journey." }));
    const body = await response.json();

    expect({ status: response.status, body }).toMatchObject({
      status: 422,
      body: { code: "DOCUMENT_KIND_MISMATCH" },
    });
    expect(body.message).toContain("registration certificate");
    expect(mocks.propose).not.toHaveBeenCalled();
  });
});
