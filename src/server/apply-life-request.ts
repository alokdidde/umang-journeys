import type { LifeRequestPlan } from "@/domain/life-request";
import type { JourneyRepository, JourneySubjectSeed, StoredJourney } from "./repositories/journey-repository";

function factsFrom(items: Array<{ key: string; value: string }>) {
  return Object.fromEntries(items.map((fact) => [fact.key, fact.value]));
}

function displayNameFor(subject: LifeRequestPlan["subjects"][number], facts: Record<string, string>) {
  if (subject.type === "child") return facts["child.name"]?.trim() || facts["person.name"]?.trim() || subject.displayName;
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
    "intake.entityKind": subject.entityKind,
  };
  if ((subject.type === "person" || subject.type === "child") && subject.relationship) {
    facts["person.relationship"] = subject.relationship;
  }
  if (subject.type === "child") {
    if (!facts["child.name"] && facts["person.name"]) facts["child.name"] = facts["person.name"];
    if (!facts["person.name"] && facts["child.name"]) facts["person.name"] = facts["child.name"];
    if (!facts["child.dateOfBirth"] && facts["person.dateOfBirth"]) facts["child.dateOfBirth"] = facts["person.dateOfBirth"];
    if (!facts["person.dateOfBirth"] && facts["child.dateOfBirth"]) facts["person.dateOfBirth"] = facts["child.dateOfBirth"];
  }
  if (need.lifeEvent === "managing_health_cover" && subject.type === "child") {
    facts["health.coverageFor"] = "dependent";
    facts["health.dependentRelationship"] = subject.relationship || "child";
  }
  return facts;
}

export async function applyLifeRequest(sessionId: string, plan: LifeRequestPlan, answers: Record<string, string>, repository: JourneyRepository) {
  const missing = plan.questions.filter((question) => question.required && !answers[question.id]?.trim());
  if (missing.length) throw Object.assign(new Error("Complete the required details before adding this to My life."), { code: "MISSING_REQUIRED_ANSWERS", fields: missing.map((question) => question.id) });

  const graphSeeds = plan.subjects.map((subject) => {
    const subjectNeeds = plan.needs.filter((need) => need.subjectRef === subject.ref);
    const facts = subjectNeeds.length ? Object.assign({}, ...subjectNeeds.map((need) => factsForNeed(plan, subject, need, answers))) : {
      ...factsFrom(subject.facts),
      ...Object.fromEntries(plan.questions
        .filter((question) => question.subjectRef === subject.ref && answers[question.id]?.trim())
        .map((question) => [question.factKey, answers[question.id].trim()])),
    };
    const unavailableNeeds = plan.unavailableNeeds.filter((need) => need.subjectRef === subject.ref).map(({ label, description, reason }) => ({ label, description, reason }));
    return { ref: subject.ref, type: subject.type, entityKind: subject.entityKind, displayName: displayNameFor(subject, facts), facts: { ...facts, ...(unavailableNeeds.length ? { "intake.unavailableNeeds": JSON.stringify(unavailableNeeds), "intake.recordVisibility": "standalone" } : {}) }, isAccountHolder: subject.isAccountHolder, canonicalEntityId: subject.existingEntityId };
  });
  const resolvedIds = await repository.syncEntityGraph(sessionId, graphSeeds, plan.associations);
  const existing = await repository.list(sessionId);
  const journeys: StoredJourney[] = [];
  const entityIds = new Map<string, string>(Object.entries(resolvedIds));

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
    const existingService = existing.find((journey) => journey.subject.canonicalEntityId === entityIds.get(subject.ref) && journey.projection.templateId === need.templateId);
    if (existingService) {
      const updated = await repository.updateFacts(sessionId, existingService.id, facts, { source: "user_statement", sourceRef: plan.requestId });
      if (updated) {
        journeys.push(updated);
        continue;
      }
    }
    const seed: JourneySubjectSeed = {
      type: subject.type,
      entityKind: subject.entityKind,
      displayName: displayNameFor(subject, facts),
      role: subject.isAccountHolder ? "account_holder" : subject.type === "person" || subject.type === "child" ? "person" : "asset",
      canonicalEntityId: entityIds.get(subject.ref),
    };
    const journey = await repository.create(sessionId, facts, need.templateId, seed);
    journeys.push(journey);
    if (journey.subject.canonicalEntityId) entityIds.set(subject.ref, journey.subject.canonicalEntityId);
  }

  const graphIds = await repository.syncEntityGraph(sessionId, graphSeeds.map((seed) => ({ ...seed, canonicalEntityId: entityIds.get(seed.ref) })), plan.associations);

  for (const [ref, entityId] of Object.entries(graphIds)) entityIds.set(ref, entityId);
  for (const subject of plan.subjects.filter((candidate) => candidate.operation === "archive")) {
    const entityId = entityIds.get(subject.ref);
    if (!entityId || !await repository.archiveEntity(sessionId, entityId, factsFrom(subject.facts)["record.archiveReason"])) {
      throw Object.assign(new Error(`The record for ${subject.displayName} could not be archived.`), { code: "ENTITY_ARCHIVE_FAILED" });
    }
  }
  const refreshed = await repository.list(sessionId);
  const refreshedById = new Map(refreshed.map((journey) => [journey.id, journey]));

  return {
    journeys: journeys.flatMap((journey) => {
      const refreshedJourney = refreshedById.get(journey.id);
      return refreshedJourney ? [refreshedJourney] : [];
    }),
    subjectEntityIds: Object.fromEntries(entityIds),
    archivedEntityIds: plan.subjects.filter((subject) => subject.operation === "archive").flatMap((subject) => entityIds.get(subject.ref) ?? []),
  };
}
