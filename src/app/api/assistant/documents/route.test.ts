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

function uploadRequest() {
  const form = { get: (key: string) => key === "file" ? new TestFile() : null };
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
});
