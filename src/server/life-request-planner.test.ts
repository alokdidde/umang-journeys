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

  it("retries one transient generation failure before showing an error", async () => {
    let calls = 0;
    const model = new MockLanguageModelV3({ doGenerate: async () => {
      calls += 1;
      if (calls === 1) throw new Error("temporary structured generation failure");
      return {
        content: [{ type: "text", text: JSON.stringify({
          supported: true,
          summary: "Organise a vehicle and a business.",
          subjects: [{ ref: "van", type: "vehicle", displayName: "Your van", facts: [] }, { ref: "business", type: "business", displayName: "Your business", facts: [] }],
          needs: [
            { id: "vehicle", subjectRef: "van", lifeEvent: "buying_a_vehicle", label: "Transfer the van", description: "Prepare its records.", confidence: 0.95, facts: [] },
            { id: "business", subjectRef: "business", lifeEvent: "starting_a_business", label: "Set up the business", description: "Prepare its registrations.", confidence: 0.95, facts: [] },
          ],
          questions: [],
        }) }],
        finishReason: { unified: "stop", raw: "stop" }, usage, warnings: [],
      };
    }});

    await expect(planLifeRequest("I bought a van and started a delivery business", { model })).resolves.toMatchObject({ needs: [{ lifeEvent: "buying_a_vehicle" }, { lifeEvent: "starting_a_business" }] });
    expect(calls).toBe(2);
  });

  it("tells the model to keep business roles separate from family relationships", async () => {
    const model = new MockLanguageModelV3({ doGenerate: {
      content: [{ type: "text", text: JSON.stringify({
        supported: true,
        summary: "Set up Sharma Foods with Rohan as an equal co-owner.",
        subjects: [{ ref: "business", type: "business", displayName: "Sharma Foods", facts: [] }, { ref: "rohan", type: "person", displayName: "Rohan", facts: [] }],
        needs: [{ id: "setup", subjectRef: "business", lifeEvent: "starting_a_business", label: "Set up Sharma Foods", description: "Prepare its registrations.", confidence: 0.99, facts: [] }],
        questions: [],
        associations: [
          { id: "self-owner", fromSubjectRef: "account_holder", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true },
          { id: "rohan-owner", fromSubjectRef: "rohan", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true },
        ],
      }) }],
      finishReason: { unified: "stop", raw: "stop" }, usage, warnings: [],
    }});

    const plan = await planLifeRequest("Rohan and I own Sharma Foods equally", { model });
    const prompt = JSON.stringify(model.doGenerateCalls[0]?.prompt);
    expect(prompt).toContain("business partner");
    expect(plan.associations).toHaveLength(2);
    expect(plan.subjects.find((subject) => subject.ref === "rohan")?.relationship).toBeUndefined();
  });
});
