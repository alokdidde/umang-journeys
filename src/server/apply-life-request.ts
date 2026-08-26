import type { LifeRequestPlan } from "@/domain/life-request";
import type { JourneyRepository, JourneySubjectSeed, StoredJourney } from "./repositories/journey-repository";

function factsFrom(items: Array<{ key: string; value: string }>) {
  return Object.fromEntries(items.map((fact) => [fact.key, fact.value]));
}

function displayNameFor(subject: LifeRequestPlan["subjects"][number], facts: Record<string, string>) {
  if (subject.type === "child") return facts["child.name"]?.trim() || subject.displayName;
  if (subject.type === "person") return facts["person.name"]?.trim() || subject.displayName;
  if (subject.type === "vehicle") return facts["vehicle.makeModel"]?.trim() || facts["vehicle.registrationNumber"]?.trim() || subject.displayName;
  if (subject.type === "residence") return facts["move.label"]?.trim() || subject.displayName;
  return facts["business.name"]?.trim() || subject.displayName;
}

function factsForNeed(plan: LifeRequestPlan, subject: LifeRequestPlan["subjects"][number], need: LifeRequestPlan["needs"][number], answers: Record<string, string>) {
  const answeredFacts = Object.fromEntries(plan.questions
    .filter((question) => question.subjectRef === subject.ref && answers[question.id]?.trim())
    .map((question) => [question.factKey, answers[question.id].trim()]));
  const facts: Record<string, string> = {
    ...factsFrom(subject.facts),
    ...factsFrom(need.facts),
    ...answeredFacts,
    "intake.requestId": plan.requestId,
    "intake.needId": need.id,
    "intake.subjectRef": subject.ref,
  };
  if ((subject.type === "person" || subject.type === "child") && subject.relationship) {
    facts["person.relationship"] = subject.relationship;
  }
  if (need.lifeEvent === "managing_health_cover" && subject.type === "child") {
    if (facts["child.name"]) facts["person.name"] = facts["child.name"];
    if (facts["child.dateOfBirth"]) facts["person.dateOfBirth"] = facts["child.dateOfBirth"];
    facts["health.coverageFor"] = "dependent";
    facts["health.dependentRelationship"] = subject.relationship || "child";
  }
  return facts;
}

export async function applyLifeRequest(sessionId: string, plan: LifeRequestPlan, answers: Record<string, string>, repository: JourneyRepository) {
  const missing = plan.questions.filter((question) => question.required && !answers[question.id]?.trim());
  if (missing.length) throw Object.assign(new Error("Complete the required details before adding this to My life."), { code: "MISSING_REQUIRED_ANSWERS", fields: missing.map((question) => question.id) });

  const existing = await repository.list(sessionId);
  const journeys: StoredJourney[] = [];
  const entityIds = new Map<string, string>();

  for (const need of plan.needs) {
    const alreadyCreated = existing.find((journey) => journey.facts["intake.requestId"] === plan.requestId && journey.facts["intake.needId"] === need.id);
    if (alreadyCreated) {
      journeys.push(alreadyCreated);
      if (alreadyCreated.subject.canonicalEntityId) entityIds.set(need.subjectRef, alreadyCreated.subject.canonicalEntityId);
      continue;
    }
    const subject = plan.subjects.find((candidate) => candidate.ref === need.subjectRef);
    if (!subject) throw Object.assign(new Error("The request contains an unknown person or thing."), { code: "INVALID_SUBJECT_REFERENCE" });
    const facts = factsForNeed(plan, subject, need, answers);
    const seed: JourneySubjectSeed = {
      type: subject.type,
      displayName: displayNameFor(subject, facts),
      role: subject.type === "person" && !subject.relationship ? "account_holder" : subject.type === "person" || subject.type === "child" ? "dependent" : "asset",
      canonicalEntityId: entityIds.get(subject.ref),
    };
    const journey = await repository.create(sessionId, facts, need.templateId, seed);
    journeys.push(journey);
    if (journey.subject.canonicalEntityId) entityIds.set(subject.ref, journey.subject.canonicalEntityId);
  }

  return { journeys, subjectEntityIds: Object.fromEntries(entityIds) };
}
