import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDemoSession: vi.fn(),
  getJourney: vi.fn(),
  updateFacts: vi.fn(),
  advanceService: vi.fn(),
}));

vi.mock("@/server/session", () => ({ getDemoSession: mocks.getDemoSession }));
vi.mock("@/server/repositories/journey-repository", () => ({
  journeyRepository: {
    get: mocks.getJourney,
    updateFacts: mocks.updateFacts,
    advanceService: mocks.advanceService,
  },
}));

import { POST } from "./route";

const currentJourney = {
  id: "journey-1",
  facts: {},
  evidence: [
    { type: "vehicle_rc", verificationStatus: "verified" },
    { type: "sale_agreement", verificationStatus: "verified" },
  ],
  projection: {
    nodes: [{ key: "ownership_transfer", status: "available", action: "synthetic_agency" }],
  },
};

describe("POST /api/journeys/[id]/nodes/[key]/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDemoSession.mockResolvedValue("demo-session");
    mocks.getJourney.mockResolvedValue(currentJourney);
    mocks.advanceService.mockResolvedValue(currentJourney);
  });

  it("does not send a case to AI without explicit, unexpired consent", async () => {
    const response = await POST(
      new Request("http://localhost/api/journeys/journey-1/nodes/ownership_transfer/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: "consent-test-123" }),
      }),
      { params: Promise.resolve({ id: "journey-1", key: "ownership_transfer" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "AI_CONSENT_REQUIRED" });
    expect(mocks.advanceService).not.toHaveBeenCalled();
  });

  it("records explicit consent before sending the case to AI", async () => {
    const consentedJourney = {
      ...currentJourney,
      facts: { "agency.consent.ownership_transfer": new Date(Date.now() + 30 * 60 * 1000).toISOString() },
    };
    mocks.updateFacts.mockResolvedValue(consentedJourney);
    mocks.advanceService.mockResolvedValue(consentedJourney);

    const response = await POST(
      new Request("http://localhost/api/journeys/journey-1/nodes/ownership_transfer/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idempotencyKey: "consent-test-456", consent: true }),
      }),
      { params: Promise.resolve({ id: "journey-1", key: "ownership_transfer" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.updateFacts).toHaveBeenCalledWith("demo-session", "journey-1", {
      "agency.consent.ownership_transfer": expect.any(String),
    });
    expect(mocks.advanceService).toHaveBeenCalledWith("demo-session", "journey-1", "ownership_transfer", "consent-test-456");
  });
});
