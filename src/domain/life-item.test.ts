import { describe, expect, it } from "vitest";
import { groupLifeItems, lifeItemCollection, lifeItemKindLabel } from "./life-item";
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
    expect(items[0]?.state).toBe("attention");
  });

  it("keeps requests without verified guidance out of the caught-up state", () => {
    const [item] = groupLifeItems([], [{
      id: "farm",
      kind: "property",
      displayName: "Inherited farm",
      unavailableNeeds: [{ label: "Transfer the land record", description: "Guidance is not available for this location yet.", reason: "Location-specific research is required." }],
      updatedAt: "2026-08-27T00:00:00.000Z",
    }]);
    expect(item).toMatchObject({ state: "guidance_unavailable", completed: false });
  });

  it("treats a plain saved record with no pending request as caught up", () => {
    const [item] = groupLifeItems([], [{ id: "pet", kind: "animal", displayName: "Milo", unavailableNeeds: [], updatedAt: "2026-08-27T00:00:00.000Z" }]);
    expect(item).toMatchObject({ state: "caught_up", completed: true });
  });

  it("uses a stated family relationship as the label", () => {
    const child = summary("baby", "Having a baby", "Register birth");
    child.subject.context = { relationshipToAccountHolder: "daughter" };
    const [item] = groupLifeItems([child]);
    expect(lifeItemKindLabel(item!)).toBe("Daughter");
    expect(lifeItemCollection(item!)).toBe("family");
  });

  it("does not classify an unrelated business partner as family", () => {
    const partner = summary("cover", "Health cover", "Review cover");
    partner.subject = { id: "partner", canonicalEntityId: "person-rohan", type: "person", displayName: "Rohan", role: "person" };
    const [item] = groupLifeItems([partner]);
    expect(lifeItemKindLabel(item!)).toBe("Person");
    expect(lifeItemCollection(item!)).toBe("people");
  });

  it("keeps several contextual roles on one business record", () => {
    const business = summary("business", "Starting a business", "Review registrations");
    business.subject = {
      id: "business", canonicalEntityId: "business-one", type: "business", displayName: "Sharma Foods", role: "asset",
      context: { connectedPeople: [{ entityId: "rohan", displayName: "Rohan", isAccountHolder: false, roles: ["Co-owner", "Director"], ownershipShare: 50, canAct: true }] },
    };
    const [item] = groupLifeItems([business]);
    expect(item?.context?.connectedPeople?.[0]).toMatchObject({ displayName: "Rohan", roles: ["Co-owner", "Director"], ownershipShare: 50 });
    expect(lifeItemCollection(item!)).toBe("work_organisations");
  });

  it.each([
    ["property", "homes_property", "Property or land"],
    ["registered_asset", "vehicles_assets", "Registered asset"],
    ["organisation", "work_organisations", "Organisation"],
    ["animal", "other", "Animal"],
    ["estate", "other", "Estate or trust"],
  ] as const)("projects %s records into %s", (entityKind, collection, label) => {
    const record = summary(entityKind, "Service", "Review");
    record.subject = { ...record.subject, type: "person", entityKind, role: "asset" };
    const [item] = groupLifeItems([record]);
    expect(lifeItemCollection(item!)).toBe(collection);
    expect(lifeItemKindLabel(item!)).toBe(label);
  });

  it("keeps a family member in My family even though their entity kind is person", () => {
    const record = summary("mother", "Health cover", "Review");
    record.subject = { ...record.subject, type: "person", entityKind: "person", context: { relationshipToAccountHolder: "mother" } };
    const [item] = groupLifeItems([record]);
    expect(lifeItemCollection(item!)).toBe("family");
  });
});
