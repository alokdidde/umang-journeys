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

  it("keeps a child's confirmed name when the planner uses the person-name fact", async () => {
    const repository = new MemoryJourneyRepository();
    const plan = prepareLifeRequest({
      ...output,
      questions: [
        { id: "name", subjectRef: "baby", factKey: "person.name", label: "What is your baby's full name?", input: "text" as const, required: true },
      ],
    }, "request-child-person-name");

    const result = await applyLifeRequest("session", plan, { name: "Aarohi Sharma" }, repository);

    expect(result.journeys.map((journey) => journey.subject.displayName)).toEqual(["Aarohi Sharma", "Aarohi Sharma"]);
    expect(result.journeys[0]?.facts).toMatchObject({ "child.name": "Aarohi Sharma", "person.name": "Aarohi Sharma" });
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

  it("keeps a daughter in the family context without treating every person as a dependent", async () => {
    const repository = new MemoryJourneyRepository();
    const result = await applyLifeRequest("session", prepareLifeRequest(output, "request-daughter"), { name: "Aarohi Sharma" }, repository);

    expect(result.journeys[0]?.subject.role).toBe("person");
    expect(result.journeys[0]?.subject.context).toMatchObject({ relationshipToAccountHolder: "daughter" });
  });

  it("adds a business partner as a connected co-owner, not as a family member", async () => {
    const repository = new MemoryJourneyRepository();
    const plan = prepareLifeRequest({
      supported: true,
      summary: "Set up Sharma Foods for its two equal owners.",
      subjects: [
        { ref: "business", type: "business", displayName: "Sharma Foods", facts: [{ key: "business.name", value: "Sharma Foods", confidence: 1 }] },
        { ref: "rohan", type: "person", displayName: "Rohan Mehta", facts: [{ key: "person.name", value: "Rohan Mehta", confidence: 1 }] },
      ],
      needs: [{ id: "setup", subjectRef: "business", lifeEvent: "starting_a_business", label: "Set up Sharma Foods", description: "Prepare its registrations.", confidence: 0.99, facts: [] }],
      questions: [],
      associations: [
        { id: "self-owner", fromSubjectRef: "account_holder", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true },
        { id: "rohan-owner", fromSubjectRef: "rohan", toSubjectRef: "business", kind: "owner", role: "Co-owner", ownershipShare: 50, canAct: true },
        { id: "rohan-director", fromSubjectRef: "rohan", toSubjectRef: "business", kind: "director", role: "Director", canAct: true },
      ],
    }, "request-coowners");

    const result = await applyLifeRequest("session", plan, {}, repository);

    expect(result.journeys).toHaveLength(1);
    expect(result.subjectEntityIds).toHaveProperty("rohan");
    expect(result.journeys[0]?.subject.context?.relationshipToAccountHolder).toBeUndefined();
    expect(result.journeys[0]?.subject.context?.connectedPeople).toEqual([
      { entityId: expect.any(String), displayName: "You", isAccountHolder: true, roles: ["Co-owner"], ownershipShare: 50, canAct: true },
      { entityId: expect.any(String), displayName: "Rohan Mehta", isAccountHolder: false, roles: ["Co-owner", "Director"], ownershipShare: 50, canAct: true },
    ]);
  });

  it("can connect a non-owner signatory without inventing ownership", async () => {
    const repository = new MemoryJourneyRepository();
    const plan = prepareLifeRequest({
      supported: true,
      summary: "Set up a business with an authorised signatory.",
      subjects: [
        { ref: "business", type: "business", displayName: "North Star Studio", facts: [] },
        { ref: "signatory", type: "person", displayName: "Leena Rao", facts: [] },
      ],
      needs: [{ id: "setup", subjectRef: "business", lifeEvent: "starting_a_business", label: "Set up the business", description: "Prepare registrations.", confidence: 0.9, facts: [] }],
      questions: [],
      associations: [{ id: "signatory", fromSubjectRef: "signatory", toSubjectRef: "business", kind: "authorised_signatory", role: "Authorised signatory", canAct: true }],
    }, "request-signatory");

    const result = await applyLifeRequest("session", plan, {}, repository);
    expect(result.journeys[0]?.subject.context?.connectedPeople?.[0]).toMatchObject({ displayName: "Leena Rao", roles: ["Authorised signatory"], canAct: true });
    expect(result.journeys[0]?.subject.context?.connectedPeople?.[0]?.ownershipShare).toBeUndefined();
  });

  it("recognises the same child in a later request when a birth date is added", async () => {
    const repository = new MemoryJourneyRepository();
    const first = prepareLifeRequest({
      supported: true, summary: "Arrange Aarohi's health cover.",
      subjects: [{ ref: "child", type: "child", displayName: "Aarohi Sharma", relationship: "daughter", facts: [{ key: "child.name", value: "Aarohi Sharma", confidence: 1 }] }],
      needs: [{ id: "cover", subjectRef: "child", lifeEvent: "managing_health_cover", label: "Health cover", description: "Prepare cover.", confidence: 1, facts: [] }], questions: [],
    }, "request-aarohi-cover");
    const second = prepareLifeRequest({
      supported: true, summary: "Organise Aarohi's birth records.",
      subjects: [{ ref: "baby", type: "child", displayName: "Aarohi Sharma", relationship: "daughter", facts: [{ key: "child.name", value: "Aarohi Sharma", confidence: 1 }, { key: "child.dateOfBirth", value: "2026-08-20", confidence: 1 }] }],
      needs: [{ id: "birth", subjectRef: "baby", lifeEvent: "having_a_baby", label: "Birth records", description: "Prepare records.", confidence: 1, facts: [] }], questions: [],
    }, "request-aarohi-birth");

    const firstResult = await applyLifeRequest("session", first, {}, repository);
    const secondResult = await applyLifeRequest("session", second, {}, repository);
    expect(secondResult.subjectEntityIds.baby).toBe(firstResult.subjectEntityIds.child);
  });

  it("does not merge two people with the same name when their birth dates conflict", async () => {
    const repository = new MemoryJourneyRepository();
    const makePlan = (requestId: string, ref: string, birthDate: string) => prepareLifeRequest({
      supported: true, summary: "Arrange health cover.",
      subjects: [{ ref, type: "person", displayName: "Kiran Sharma", facts: [{ key: "person.name", value: "Kiran Sharma", confidence: 1 }, { key: "person.dateOfBirth", value: birthDate, confidence: 1 }] }],
      needs: [{ id: "cover", subjectRef: ref, lifeEvent: "managing_health_cover", label: "Health cover", description: "Prepare cover.", confidence: 1, facts: [] }], questions: [],
    }, requestId);

    const first = await applyLifeRequest("session", makePlan("request-kiran-one", "kiran1", "1970-01-01"), {}, repository);
    const second = await applyLifeRequest("session", makePlan("request-kiran-two", "kiran2", "1985-02-02"), {}, repository);
    expect(second.subjectEntityIds.kiran2).not.toBe(first.subjectEntityIds.kiran1);
  });

  it("reuses the account holder for personal health and retirement services", async () => {
    const repository = new MemoryJourneyRepository();
    const plan = prepareLifeRequest({
      supported: true, summary: "Organise my health cover and retirement.",
      subjects: [{ ref: "me", type: "person", displayName: "Ananya Sharma", isAccountHolder: true, facts: [{ key: "person.name", value: "Ananya Sharma", confidence: 1 }] }],
      needs: [
        { id: "cover", subjectRef: "me", lifeEvent: "managing_health_cover", label: "My health cover", description: "Prepare cover.", confidence: 1, facts: [] },
        { id: "retire", subjectRef: "me", lifeEvent: "retirement", label: "My retirement", description: "Prepare retirement records.", confidence: 1, facts: [] },
      ], questions: [],
    }, "request-self");

    const result = await applyLifeRequest("session", plan, {}, repository);
    expect(new Set(result.journeys.map((journey) => journey.subject.canonicalEntityId))).toHaveLength(1);
    expect(result.journeys.every((journey) => journey.subject.role === "account_holder")).toBe(true);
  });
});
