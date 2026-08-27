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
    expect(plan.subjects[0]?.entityKind).toBe("person");
  });

  it("preserves a broader entity kind while using a compatible guided subject", () => {
    const output = lifeRequestOutputSchema.parse({
      supported: true,
      summary: "Prepare the move for a rented shop.",
      subjects: [{ ref: "shop", type: "residence", entityKind: "premises", displayName: "Khan Market shop", facts: [] }],
      needs: [{ id: "move", subjectRef: "shop", lifeEvent: "moving_home", label: "Update services", description: "Prepare address-related services.", confidence: 0.9, facts: [] }],
      questions: [],
    });

    expect(prepareLifeRequest(output, "request-shop").subjects[0]?.entityKind).toBe("premises");
  });

  it("keeps an understood record when its requested service is not guided yet", () => {
    const plan = prepareLifeRequest({
      supported: true,
      summary: "Keep your inherited farm and note the mutation request.",
      subjects: [{ ref: "farm", type: "residence", entityKind: "property", displayName: "Inherited farm", facts: [{ key: "property.surveyNumber", value: "118/2", confidence: 1 }] }],
      needs: [],
      unavailableNeeds: [{ id: "mutation", subjectRef: "farm", label: "Transfer the land record", description: "Mutation guidance is not available for this location yet.", reason: "This service needs location-specific research." }],
      questions: [],
      associations: [{ id: "owner", fromSubjectRef: "account_holder", toSubjectRef: "farm", kind: "owner", role: "Owner", canAct: true }],
    }, "request-farm");

    expect(plan.needs).toHaveLength(0);
    expect(plan.unavailableNeeds[0]).toMatchObject({ subjectRef: "farm", label: "Transfer the land record" });
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

  it("records family as a relationship instead of making it a global person role", () => {
    const output = lifeRequestOutputSchema.parse({
      supported: true,
      summary: "Add your daughter and organise health cover.",
      subjects: [{ ref: "aarohi", type: "child", displayName: "Aarohi", relationship: "daughter", facts: [] }],
      needs: [{ id: "cover", subjectRef: "aarohi", lifeEvent: "managing_health_cover", label: "Health cover", description: "Prepare health cover.", confidence: 0.98, facts: [] }],
      questions: [],
    });

    expect(prepareLifeRequest(output, "request-family").associations).toEqual([{
      id: "family-aarohi",
      fromSubjectRef: "account_holder",
      toSubjectRef: "aarohi",
      kind: "family",
      role: "daughter",
    }]);
  });

  it("allows several people to hold distinct roles in one business", () => {
    const output = lifeRequestOutputSchema.parse({
      supported: true,
      summary: "Set up Sharma Foods for its two equal owners.",
      subjects: [
        { ref: "business", type: "business", displayName: "Sharma Foods", facts: [] },
        { ref: "rohan", type: "person", displayName: "Rohan Mehta", facts: [] },
      ],
      needs: [{ id: "setup", subjectRef: "business", lifeEvent: "starting_a_business", label: "Set up Sharma Foods", description: "Prepare its registrations.", confidence: 0.98, facts: [] }],
      questions: [],
      associations: [
        { id: "alok-owner", fromSubjectRef: "account_holder", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true },
        { id: "rohan-owner", fromSubjectRef: "rohan", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true },
        { id: "rohan-director", fromSubjectRef: "rohan", toSubjectRef: "business", kind: "director", role: "Director", canAct: true },
      ],
    });

    const plan = prepareLifeRequest(output, "request-business");
    expect(plan.associations).toHaveLength(3);
    expect(plan.subjects.find((subject) => subject.ref === "rohan")?.relationship).toBeUndefined();
  });

  it("rejects ownership percentages on relationships that do not represent ownership", () => {
    expect(() => lifeRequestOutputSchema.parse({
      supported: true,
      summary: "Add an accountant to a business.",
      subjects: [{ ref: "business", type: "business", displayName: "Sharma Foods", facts: [] }, { ref: "accountant", type: "person", displayName: "Meera", facts: [] }],
      needs: [{ id: "setup", subjectRef: "business", lifeEvent: "starting_a_business", label: "Set up the business", description: "Prepare it.", confidence: 0.9, facts: [] }],
      questions: [],
      associations: [{ id: "accountant", fromSubjectRef: "accountant", toSubjectRef: "business", kind: "adviser", role: "Accountant", ownershipShare: 30 }],
    })).toThrow();
  });
});
