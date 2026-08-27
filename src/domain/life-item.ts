import type { JourneyNextAction, JourneySummary, JourneySubject } from "./journey-summary";

export type LifeItem = {
  entityId: string;
  displayName: string;
  type: JourneySubject["type"];
  role?: JourneySubject["role"];
  context?: JourneySubject["context"];
  needs: JourneySummary[];
  actions: Array<JourneyNextAction & { journeyId: string; needTitle: string }>;
  completed: boolean;
  updatedAt: string;
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/(^|\s)\S/g, (letter) => letter.toLocaleUpperCase("en-IN"));
}

export function lifeItemKindLabel(item: Pick<LifeItem, "type" | "context" | "role">) {
  if (item.context?.relationshipToAccountHolder) return titleCase(item.context.relationshipToAccountHolder);
  if (item.context?.householdMember) return "Household member";
  if (item.role === "account_holder") return "You";
  if (item.type === "child") return "Child";
  if (item.type === "person") return "Person";
  if (item.type === "residence") return "Home";
  if (item.type === "vehicle") return "Vehicle";
  return "Business";
}

export function lifeItemCollection(item: Pick<LifeItem, "type" | "context" | "role">) {
  if ((item.type === "child" || item.type === "person") && item.context?.relationshipToAccountHolder) return "family" as const;
  if (item.type === "child" || item.type === "person") return "people" as const;
  if (item.type === "residence") return "homes" as const;
  if (item.type === "vehicle") return "vehicles" as const;
  return "businesses" as const;
}

export function groupLifeItems(journeys: JourneySummary[]): LifeItem[] {
  const groups = new Map<string, JourneySummary[]>();
  for (const journey of journeys) {
    const key = journey.subject.canonicalEntityId ?? journey.subject.id;
    groups.set(key, [...(groups.get(key) ?? []), journey]);
  }
  return [...groups.entries()].map(([entityId, needs]) => {
    const subject = needs[0]!.subject;
    return {
      entityId,
      displayName: subject.displayName,
      type: subject.type,
      role: subject.role,
      context: needs.map((need) => need.subject.context).find((context) => context && (context.relationshipToAccountHolder || context.connectedPeople?.length)) ?? subject.context,
      needs,
      actions: needs.flatMap((need) => need.nextAction ? [{ ...need.nextAction, journeyId: need.id, needTitle: need.title }] : []),
      completed: needs.every((need) => need.status === "completed"),
      updatedAt: needs.map((need) => need.updatedAt).sort().at(-1)!,
    };
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
