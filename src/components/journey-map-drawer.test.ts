import { describe, expect, it } from "vitest";
import { filterJourneyProjection, graphLayout } from "@/components/journey-map-drawer";
import { compileJourney, journeyTemplates } from "@/domain/journey-engine";

describe("journey map layout", () => {
  it("places every rich graph node once inside its branch lane without card collisions", () => {
    for (const template of journeyTemplates) {
      const projection = compileJourney(template);
      const layout = graphLayout(projection);

      expect(layout.lanes).toHaveLength(projection.branches.length);
      expect(layout.nodes.map(({ node }) => node.key).sort()).toEqual(projection.nodes.map((node) => node.key).sort());
      expect(new Set(layout.nodes.map(({ x, y }) => `${x}:${y}`)).size).toBe(layout.nodes.length);

      for (const positioned of layout.nodes) {
        const lane = layout.lanes.find(({ branch }) => branch.key === positioned.node.branchKey)!;
        expect(positioned.x).toBeGreaterThan(lane.x);
        expect(positioned.y).toBeGreaterThanOrEqual(lane.y);
        expect(positioned.y + 164).toBeLessThanOrEqual(lane.y + lane.height);
      }
    }
  });

  it("shows only active or context-relevant branches in the focused scope", () => {
    const projection = compileJourney(journeyTemplates.find((template) => template.id === "new-baby.india.v1")!);
    const filtered = filterJourneyProjection(projection, { scope: "relevant", query: "" });

    expect(filtered.branches.some((branch) => branch.requirement === "required")).toBe(true);
    expect(filtered.branches.some((branch) => branch.requirement === "optional" && !branch.active)).toBe(false);
    expect(filtered.nodes.every((node) => node.applicability !== "not_applicable")).toBe(true);
  });

  it("searches node, branch, and authority copy without leaving orphaned edges", () => {
    const projection = compileJourney(journeyTemplates.find((template) => template.id === "vehicle-purchase.india.v1")!);
    const filtered = filterJourneyProjection(projection, { scope: "all", query: "pollution" });
    const keys = new Set(filtered.nodes.map((node) => node.key));

    expect(filtered.nodes.map((node) => node.key)).toContain("puc_milestone");
    expect(filtered.edges.every((edge) => keys.has(edge.from) && keys.has(edge.to))).toBe(true);
  });
});
