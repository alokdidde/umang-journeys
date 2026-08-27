import { describe, expect, it } from "vitest";
import { compileJourney, newBabyTemplate } from "./journey-engine";
import { deriveJourneyWork } from "./journey-work";

describe("journey work projection", () => {
  it("presents every relevant node once in a citizen-facing state", () => {
    const base = compileJourney(newBabyTemplate);
    const statuses = ["in_progress", "waiting_external", "available", "blocked", "completed", "locked", "skipped"] as const;
    const projection = {
      ...base,
      nodes: base.nodes.slice(0, statuses.length).map((node, index) => ({
        ...node,
        status: statuses[index],
        actionable: index !== 5,
        applicability: "applicable" as const,
      })),
    };

    const work = deriveJourneyWork(projection);

    expect(work.happeningNow.map((node) => node.status)).toEqual(["in_progress", "waiting_external"]);
    expect(work.readyNow.map((node) => node.status)).toEqual(["available", "blocked"]);
    expect(work.completed.map((node) => node.status)).toEqual(["completed", "skipped"]);
    expect(work.later.map((node) => node.status)).toEqual(["locked"]);
    expect(Object.values(work).flat()).toHaveLength(projection.nodes.length);
  });

  it("puts recommended ready work first without hiding parallel choices", () => {
    const base = compileJourney(newBabyTemplate);
    const available = base.nodes.slice(0, 3).map((node, index) => ({
      ...node,
      status: "available" as const,
      actionable: true,
      applicability: "applicable" as const,
      recommended: index === 2,
    }));

    const work = deriveJourneyWork({ ...base, nodes: available });

    expect(work.readyNow).toHaveLength(3);
    expect(work.readyNow[0]?.key).toBe(available[2]?.key);
  });

  it("keeps steps that do not apply out of the active plan", () => {
    const base = compileJourney(newBabyTemplate);
    const node = { ...base.nodes[0]!, applicability: "not_applicable" as const, status: "skipped" as const };

    const work = deriveJourneyWork({ ...base, nodes: [node] });

    expect(work.notNeeded).toEqual([node]);
    expect(work.completed).toEqual([]);
  });
});
