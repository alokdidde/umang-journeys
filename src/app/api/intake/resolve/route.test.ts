import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDemoSession: vi.fn(),
  resolveIntake: vi.fn(),
}));

vi.mock("@/server/session", () => ({ getDemoSession: mocks.getDemoSession }));
vi.mock("@/server/intake-resolver", () => ({ resolveIntake: mocks.resolveIntake }));

import { POST } from "./route";

describe("POST /api/intake/resolve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDemoSession.mockResolvedValue("demo-session");
  });

  it("returns the AI result from the resolver", async () => {
    mocks.resolveIntake.mockResolvedValue({
      supported: true,
      resolver: "ai_gateway",
      lifeEvent: { value: "moving_home", confidence: 0.95 },
      facts: [],
      clarification: {
        key: "move.hasAddressEvidence",
        question: "Do you have address evidence?",
        choices: ["yes", "not_sure", "no"],
      },
    });

    const response = await POST(new Request("http://localhost/api/intake/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statement: "We are moving home" }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ resolver: "ai_gateway", lifeEvent: { value: "moving_home" } });
    expect(mocks.resolveIntake).toHaveBeenCalledWith("We are moving home");
  });

  it("serializes an AI SDK failure as a retryable 503", async () => {
    mocks.resolveIntake.mockRejectedValue(Object.assign(new Error("AI could not analyse that request. Please try again."), {
      code: "AI_INTAKE_FAILED",
    }));

    const response = await POST(new Request("http://localhost/api/intake/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statement: "I need help with health insurance" }),
    }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      code: "AI_INTAKE_FAILED",
      message: "AI could not analyse that request. Please try again.",
    });
  });
});
