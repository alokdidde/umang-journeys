import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDemoSession: vi.fn(),
  getJourney: vi.fn(),
  addEvidence: vi.fn(),
  ingestUploadedEvidence: vi.fn(),
  createSampleEvidence: vi.fn(),
}));

vi.mock("@/server/session", () => ({ getDemoSession: mocks.getDemoSession }));
vi.mock("@/server/evidence-ingestion", () => ({
  ingestUploadedEvidence: mocks.ingestUploadedEvidence,
  createSampleEvidence: mocks.createSampleEvidence,
}));
vi.mock("@/server/repositories/journey-repository", () => ({
  journeyRepository: { get: mocks.getJourney, addEvidence: mocks.addEvidence },
}));

import { POST } from "./route";

class TestFile {
  name = "receipt.pdf";
  type = "application/pdf";
  async arrayBuffer() { return Uint8Array.from(Buffer.from("%PDF-1.4\n%%EOF")).buffer; }
}

describe("POST /api/journeys/[id]/evidence", () => {
  afterEach(() => vi.unstubAllGlobals());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("File", TestFile);
    mocks.getDemoSession.mockResolvedValue("demo-session");
    mocks.getJourney.mockResolvedValue({ id: "journey-1", facts: {} });
  });

  it("returns 503 and leaves the journey unchanged when AI analysis fails", async () => {
    mocks.ingestUploadedEvidence.mockRejectedValue(Object.assign(new Error("AI could not analyse that document. Please try again or upload a clearer copy."), {
      code: "AI_DOCUMENT_ANALYSIS_FAILED",
    }));
    const file = new TestFile();
    const form = { get: (key: string) => key === "type" ? "vaccination_receipt" : key === "file" ? file : null };

    const response = await POST(
      { headers: new Headers({ "content-type": "multipart/form-data" }), formData: async () => form } as unknown as Request,
      { params: Promise.resolve({ id: "journey-1" }) },
    );
    const body = await response.json();

    expect({ status: response.status, body }).toMatchObject({ status: 503, body: { code: "DOCUMENT_ANALYSIS_FAILED" } });
    expect(mocks.addEvidence).not.toHaveBeenCalled();
  });
});
