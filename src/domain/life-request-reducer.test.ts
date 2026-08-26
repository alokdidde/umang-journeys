import { describe, expect, it } from "vitest";
import { initialLifeRequestState, lifeRequestReducer } from "./life-request-reducer";

describe("life request interaction", () => {
  it("moves from interpretation to details to approval without creating anything", () => {
    const analysing = lifeRequestReducer(initialLifeRequestState, { type: "analyse" });
    const details = lifeRequestReducer(analysing, { type: "planned", plan: {
      supported: true, resolver: "ai_gateway", requestId: "request-1", summary: "One child, two needs.",
      subjects: [{ ref: "baby", type: "child", displayName: "Your baby", facts: [] }],
      needs: [{ id: "cover", subjectRef: "baby", lifeEvent: "managing_health_cover", templateId: "health-insurance.india.v1", label: "Arrange health cover", description: "Review cover.", confidence: 1, facts: [] }],
      questions: [{ id: "name", subjectRef: "baby", factKey: "child.name", label: "Baby's name", input: "text", required: true }],
    } });
    const answered = lifeRequestReducer(details, { type: "answer", id: "name", value: "Mira" });

    expect(details.phase).toBe("details");
    expect(answered).toMatchObject({ phase: "details", answers: { name: "Mira" } });
    expect(lifeRequestReducer(answered, { type: "review" }).phase).toBe("proposal");
  });
});
