import { afterEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { planLifeRequest } from "./life-request-planner";

afterEach(() => vi.unstubAllEnvs());

const usage = {
  inputTokens: { total: 42, noCache: 42, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 80, text: 80, reasoning: 0 },
};

describe("AI life request planner", () => {
  it("turns one sentence into two needs for one child", async () => {
    const model = new MockLanguageModelV3({ doGenerate: {
      content: [{ type: "text", text: JSON.stringify({
        supported: true,
        summary: "Add your daughter and organise her first services.",
        subjects: [{ ref: "baby", type: "child", displayName: "Your baby", relationship: "daughter", facts: [] }],
        needs: [
          { id: "arrival", subjectRef: "baby", lifeEvent: "having_a_baby", label: "Set up her records", description: "Register her birth and prepare the first records.", confidence: 0.99, facts: [] },
          { id: "cover", subjectRef: "baby", lifeEvent: "managing_health_cover", label: "Arrange health cover", description: "Review how to add her to health cover.", confidence: 0.98, facts: [] },
        ],
        questions: [
          { id: "name", subjectRef: "baby", factKey: "child.name", label: "What is your baby's name?", input: "text", required: true },
          { id: "dob", subjectRef: "baby", factKey: "child.dateOfBirth", label: "When was she born?", input: "date", required: true },
        ],
      }) }],
      finishReason: { unified: "stop", raw: "stop" }, usage, warnings: [],
    }});

    const plan = await planLifeRequest("I had a baby and need insurance for her", { model, requestId: "request-1" });

    expect(plan.requestId).toBe("request-1");
    expect(plan.subjects).toHaveLength(1);
    expect(plan.needs).toHaveLength(2);
    expect(plan.needs.every((need) => need.subjectRef === "baby")).toBe(true);
    expect(JSON.stringify(model.doGenerateCalls[0]?.prompt)).toContain("same subject");
  });

  it("fails explicitly without an AI gateway", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    await expect(planLifeRequest("I had a baby")).rejects.toMatchObject({ code: "AI_GATEWAY_NOT_CONFIGURED" });
  });
});
