import { describe, expect, it } from "vitest";
import { groupLifeItems } from "./life-item";
import type { JourneySummary } from "./journey-summary";

function summary(id: string, title: string, action: string): JourneySummary {
  return {
    id, templateId: `${id}.v1`, title, status: "active", updatedAt: "2026-08-27T00:00:00.000Z",
    subject: { id: `subject-${id}`, canonicalEntityId: "entity-mira", type: "child", displayName: "Mira", role: "dependent" },
    progress: { completed: 0, total: 2, percent: 0 },
    nextAction: { nodeKey: action, title: action, description: "Next step", status: "available", stateLabel: "Ready to start", timingLabel: "Now", href: `/journeys/${id}` },
  };
}

describe("My life grouping", () => {
  it("shows one subject with the next actions from all of its service needs", () => {
    const items = groupLifeItems([summary("baby", "Having a baby", "Register birth"), summary("cover", "Health cover", "Add dependent")]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ entityId: "entity-mira", displayName: "Mira", type: "child" });
    expect(items[0]?.needs.map((need) => need.title)).toEqual(["Having a baby", "Health cover"]);
    expect(items[0]?.actions.map((action) => action.title)).toEqual(["Register birth", "Add dependent"]);
  });
});
