import { describe, expect, it } from "vitest";
import { graphLayout } from "@/components/journey-map-drawer";
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
});
