import { describe, expect, it } from "vitest";
import { lifeRequestOutputSchema, prepareLifeRequest } from "./life-request";

describe("life request plan", () => {
  it("keeps several needs attached to the same real-world subject", () => {
    const output = lifeRequestOutputSchema.parse({
      supported: true,
      summary: "Add your daughter and organise what she needs next.",
      subjects: [{ ref: "baby", type: "child", displayName: "Your baby", relationship: "daughter", facts: [] }],
      needs: [
        { id: "arrival", subjectRef: "baby", lifeEvent: "having_a_baby", label: "Register her birth", description: "Start the required records.", confidence: 0.98, facts: [] },
        { id: "cover", subjectRef: "baby", lifeEvent: "managing_health_cover", label: "Add health cover", description: "Review cover for your daughter.", confidence: 0.96, facts: [] },
      ],
      questions: [],
    });

    const plan = prepareLifeRequest(output, "request-1");

    expect(plan.subjects).toHaveLength(1);
    expect(plan.needs.map((need) => need.subjectRef)).toEqual(["baby", "baby"]);
    expect(plan.needs.map((need) => need.templateId)).toEqual(["new-baby.india.v1", "health-insurance.india.v1"]);
  });

  it("rejects a need that points at a subject the plan did not define", () => {
    expect(() => lifeRequestOutputSchema.parse({
      supported: true,
      summary: "Organise health cover.",
      subjects: [{ ref: "parent", type: "person", displayName: "Your mother", facts: [] }],
      needs: [{ id: "cover", subjectRef: "missing", lifeEvent: "managing_health_cover", label: "Health cover", description: "Review cover.", confidence: 0.9, facts: [] }],
      questions: [],
    })).toThrow();
  });

  it("normalises model-authored child identity keys before review and saving", () => {
    const output = lifeRequestOutputSchema.parse({
      supported: true,
      summary: "Add your baby and organise health cover.",
      subjects: [{ ref: "baby", type: "child", displayName: "Your baby", facts: [] }],
      needs: [{ id: "cover", subjectRef: "baby", lifeEvent: "managing_health_cover", label: "Health cover", description: "Prepare health cover.", confidence: 0.96, facts: [] }],
      questions: [
        { id: "name", subjectRef: "baby", factKey: "full_name", label: "What is your baby's full name?", input: "text", required: false },
        { id: "dob", subjectRef: "baby", factKey: "date_of_birth", label: "What is your baby's date of birth?", input: "date", required: false },
      ],
    });

    expect(prepareLifeRequest(output, "request-keys").questions.map((question) => question.factKey)).toEqual(["child.name", "child.dateOfBirth"]);
  });
});
