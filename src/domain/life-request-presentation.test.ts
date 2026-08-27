import { describe, expect, it } from "vitest";
import { approvalHeading, lifeRequestDestination, presentLifeRequest } from "./life-request-presentation";
import type { LifeRequestPlan } from "./life-request";

const plan: LifeRequestPlan = {
  supported: true,
  resolver: "ai_gateway",
  requestId: "request-review",
  summary: "Help your father prepare for retirement and review his health cover.",
  associations: [{ id: "family-father", fromSubjectRef: "account_holder", toSubjectRef: "father", kind: "family", role: "father" }],
  unavailableNeeds: [],
  subjects: [{ ref: "father", type: "person", entityKind: "person", displayName: "Your father", relationship: "father", facts: [] }],
  needs: [
    { id: "retirement", subjectRef: "father", lifeEvent: "retirement", templateId: "retirement.india.v1", label: "Prepare for retirement", description: "Organise pension and retirement records.", confidence: 1, facts: [] },
    { id: "cover", subjectRef: "father", lifeEvent: "managing_health_cover", templateId: "health-insurance.india.v1", label: "Review health cover", description: "Check the cover he should maintain.", confidence: 1, facts: [] },
  ],
  questions: [
    { id: "name", subjectRef: "father", factKey: "person.name", label: "What is your father’s name?", input: "text", required: true },
    { id: "retirement-date", subjectRef: "father", factKey: "retirement.expectedDate", label: "When does he expect to retire?", input: "date", required: true },
    { id: "cover-status", subjectRef: "father", factKey: "health.currentCover", label: "Does he have health cover now?", input: "choice", required: true, choices: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] },
  ],
};

describe("life request presentation", () => {
  it("shows every answered fact under the person it belongs to", () => {
    const presented = presentLifeRequest(plan, { name: "Ramesh", "retirement-date": "2027-01-15", "cover-status": "yes" });

    expect(presented[0]).toMatchObject({ displayName: "Ramesh" });
    expect(presented[0]?.details).toEqual([
      { id: "name", label: "What is your father’s name?", value: "Ramesh" },
      { id: "retirement-date", label: "When does he expect to retire?", value: "15 Jan 2027" },
      { id: "cover-status", label: "Does he have health cover now?", value: "Yes" },
    ]);
  });

  it("uses concrete names in the approval heading", () => {
    expect(approvalHeading(plan, { name: "Ramesh" })).toBe("Add Ramesh and organise 2 services");
  });

  it("opens one subject directly and gives several subjects a complete receipt", () => {
    expect(lifeRequestDestination(["entity-one"])).toBe("/life/entity-one");
    expect(lifeRequestDestination(["entity-one", "entity two", "entity-one"])).toBe("/life/added?subject=entity-one&subject=entity+two");
  });
});
