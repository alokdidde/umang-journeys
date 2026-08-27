import type { JourneyNextAction, JourneySummary, JourneySubject } from "./journey-summary";
import { entityDefinitionFor, entityKindFromLegacySubject, type LifeEntityKind } from "./life-entity";

export type LifeItem = {
  entityId: string;
  displayName: string;
  type: JourneySubject["type"];
  entityKind: LifeEntityKind;
  role?: JourneySubject["role"];
  context?: JourneySubject["context"];
  needs: JourneySummary[];
  actions: Array<JourneyNextAction & { journeyId: string; needTitle: string }>;
  unavailableNeeds: Array<{ label: string; description: string; reason: string }>;
  completed: boolean;
  updatedAt: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("en-IN"));
}

export function lifeItemKindLabel(item: Pick<LifeItem, "type" | "entityKind" | "context" | "role">) {
  if (item.context?.relationshipToAccountHolder) return titleCase(item.context.relationshipToAccountHolder);
  if (item.context?.householdMember) return "Household member";
  if (item.role === "account_holder") return "You";
  if (item.type === "child") return "Child";
  return entityDefinitionFor(item.entityKind).label;
}

export function lifeItemCollection(item: Pick<LifeItem, "type" | "entityKind" | "context" | "role">) {
  if ((item.type === "child" || item.type === "person") && item.context?.relationshipToAccountHolder) return "family" as const;
  return entityDefinitionFor(item.entityKind).collection;
}

export type LifeEntityRecordProjection = {
  id: string;
  kind: LifeEntityKind;
  displayName: string;
  context?: JourneySubject["context"];
  unavailableNeeds: Array<{ label: string; description: string; reason: string }>;
  updatedAt: string;
};

function legacyTypeForKind(kind: LifeEntityKind): JourneySubject["type"] {
  if (kind === "vehicle" || kind === "registered_asset") return "vehicle";
  if (kind === "premises" || kind === "property") return "residence";
  if (kind === "organisation") return "business";
  return "person";
}

export function groupLifeItems(journeys: JourneySummary[], entityRecords: LifeEntityRecordProjection[] = []): LifeItem[] {
  const entityRecordById = new Map(entityRecords.map((record) => [record.id, record]));
  const groups = new Map<string, JourneySummary[]>();
  for (const journey of journeys) {
    const key = journey.subject.canonicalEntityId ?? journey.subject.id;
    groups.set(key, [...(groups.get(key) ?? []), journey]);
  }
  const journeyItems = [...groups.entries()].map(([entityId, needs]) => {
    const subject = needs[0]!.subject;
    return {
      entityId,
      displayName: subject.displayName,
      type: subject.type,
      entityKind: subject.entityKind ?? entityKindFromLegacySubject(subject.type),
      role: subject.role,
      context: needs.map((need) => need.subject.context).find((context) => context && (context.relationshipToAccountHolder || context.connectedPeople?.length)) ?? subject.context,
      needs,
      actions: needs.flatMap((need) => need.nextAction ? [{ ...need.nextAction, journeyId: need.id, needTitle: need.title }] : []),
      unavailableNeeds: entityRecordById.get(entityId)?.unavailableNeeds ?? [],
      completed: needs.every((need) => need.status === "completed"),
      updatedAt: needs.map((need) => need.updatedAt).sort().at(-1)!,
    };
  });
  const journeyEntityIds = new Set(journeyItems.map((item) => item.entityId));
  const recordOnlyItems = entityRecords.filter((record) => !journeyEntityIds.has(record.id)).map((record): LifeItem => ({
    entityId: record.id,
    displayName: record.displayName,
    type: legacyTypeForKind(record.kind),
    entityKind: record.kind,
    context: record.context,
    needs: [],
    actions: [],
    unavailableNeeds: record.unavailableNeeds,
    completed: true,
    updatedAt: record.updatedAt,
  }));
  return [...journeyItems, ...recordOnlyItems].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
