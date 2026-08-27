import type { JourneyNode, JourneyProjection } from "./journey-engine";

export type JourneyWork = {
  happeningNow: JourneyNode[];
  readyNow: JourneyNode[];
  later: JourneyNode[];
  completed: JourneyNode[];
  notNeeded: JourneyNode[];
};

function recommendedFirst(left: JourneyNode, right: JourneyNode) {
  return Number(right.recommended) - Number(left.recommended);
}

/**
 * Converts the dependency graph into citizen-facing work states. This is a
 * projection only: node identity and graph relationships stay untouched.
 */
export function deriveJourneyWork(projection: JourneyProjection): JourneyWork {
  const work: JourneyWork = { happeningNow: [], readyNow: [], later: [], completed: [], notNeeded: [] };

  for (const node of projection.nodes) {
    if (node.applicability === "not_applicable") {
      work.notNeeded.push(node);
    } else if (node.status === "completed" || node.status === "skipped") {
      work.completed.push(node);
    } else if (node.status === "in_progress" || node.status === "waiting_external") {
      work.happeningNow.push(node);
    } else if ((node.status === "available" || node.status === "blocked") && node.actionable) {
      work.readyNow.push(node);
    } else {
      work.later.push(node);
    }
  }

  work.readyNow.sort(recommendedFirst);
  return work;
}
