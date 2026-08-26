import { describe, expect, it } from "vitest";
import { prepareLifeRequest } from "@/domain/life-request";
import { MemoryJourneyRepository } from "./repositories/journey-repository";
import { applyLifeRequest } from "./apply-life-request";

const output = {
  supported: true as const,
  summary: "Add your daughter and organise her first services.",
  subjects: [{ ref: "baby", type: "child" as const, displayName: "Your baby", relationship: "daughter", facts: [] }],
  needs: [
    { id: "arrival", subjectRef: "baby", lifeEvent: "having_a_baby" as const, label: "Set up her records", description: "Register her birth.", confidence: 0.99, facts: [] },
    { id: "cover", subjectRef: "baby", lifeEvent: "managing_health_cover" as const, label: "Arrange health cover", description: "Review cover.", confidence: 0.98, facts: [] },
  ],
  questions: [
    { id: "name", subjectRef: "baby", factKey: "child.name", label: "What is your baby's name?", input: "text" as const, required: true },
  ],
};

describe("applying a life request", () => {
  it("creates every need once and links them to one subject", async () => {
    const repository = new MemoryJourneyRepository();
    const plan = prepareLifeRequest(output, "request-1");

    const first = await applyLifeRequest("session", plan, { name: "Mira" }, repository);
    const repeated = await applyLifeRequest("session", plan, { name: "Mira" }, repository);

    expect(first.journeys).toHaveLength(2);
    expect(new Set(first.journeys.map((journey) => journey.subject.canonicalEntityId))).toHaveLength(1);
    expect(first.journeys.map((journey) => journey.subject.type)).toEqual(["child", "child"]);
    expect(repeated.journeys.map((journey) => journey.id)).toEqual(first.journeys.map((journey) => journey.id));
    expect(await repository.list("session")).toHaveLength(2);
  });

  it("requires the missing details that were shown for approval", async () => {
    const repository = new MemoryJourneyRepository();
    await expect(applyLifeRequest("session", prepareLifeRequest(output, "request-2"), {}, repository)).rejects.toMatchObject({ code: "MISSING_REQUIRED_ANSWERS" });
  });

  it("keeps different relatives separate even when their display labels are generic", async () => {
    const repository = new MemoryJourneyRepository();
    const plan = prepareLifeRequest({
      supported: true,
      summary: "Arrange health cover for both parents.",
      subjects: [
        { ref: "mother", type: "person", displayName: "Parent", relationship: "mother", facts: [] },
        { ref: "father", type: "person", displayName: "Parent", relationship: "father", facts: [] },
      ],
      needs: [
        { id: "mother-cover", subjectRef: "mother", lifeEvent: "managing_health_cover", label: "Health cover for mother", description: "Prepare health cover.", confidence: 0.99, facts: [] },
        { id: "father-cover", subjectRef: "father", lifeEvent: "managing_health_cover", label: "Health cover for father", description: "Prepare health cover.", confidence: 0.99, facts: [] },
      ],
      questions: [],
    }, "request-parents");

    const result = await applyLifeRequest("session", plan, {}, repository);

    expect(new Set(Object.values(result.subjectEntityIds))).toHaveLength(2);
  });
});
