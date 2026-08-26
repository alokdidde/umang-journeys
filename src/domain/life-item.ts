import type { JourneyNextAction, JourneySummary, JourneySubject } from "./journey-summary";

export type LifeItem = {
  entityId: string;
  displayName: string;
  type: JourneySubject["type"];
  role?: JourneySubject["role"];
  needs: JourneySummary[];
  actions: Array<JourneyNextAction & { journeyId: string; needTitle: string }>;
  completed: boolean;
  updatedAt: string;
};

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
      needs,
      actions: needs.flatMap((need) => need.nextAction ? [{ ...need.nextAction, journeyId: need.id, needTitle: need.title }] : []),
      completed: needs.every((need) => need.status === "completed"),
      updatedAt: needs.map((need) => need.updatedAt).sort().at(-1)!,
    };
  }).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}
