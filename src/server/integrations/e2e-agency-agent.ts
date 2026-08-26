import type { ExternalAgencyAgent } from "./external-agency-agent";

/** Explicit Playwright-only adapter. Never selected in production or as a fallback. */
export const e2eAgencyAgent: ExternalAgencyAgent = async (input) => {
  const reference = `SYN-E2E-${input.nodeKey.replaceAll("_", "-").toUpperCase()}`;
  const requestedOutcome = input.facts[`test.agencyOutcome.${input.nodeKey}`];
  if (requestedOutcome === "action_required" && input.intent !== "clarify") {
    return {
      outcome: "action_required",
      progress: 55,
      summary: "The explicit browser-test adapter requires one clarification before it can decide this synthetic case.",
      reasonCode: "MORE_INFORMATION_REQUIRED",
      actionMessage: "Confirm the child’s preferred clinic before the synthetic review can continue.",
      reference,
      events: [{ stageKey: "fixture_clarification", title: "Clarification requested", detail: "The explicit browser-test outcome requested one additional case fact." }],
      artifact: null,
    };
  }
  return {
    outcome: "approved",
    progress: 100,
    summary: `The synthetic ${input.title} case passed the Playwright fixture review.`,
    reasonCode: null,
    actionMessage: null,
    reference,
    events: [{ stageKey: "fixture_review", title: "Synthetic case reviewed", detail: `The ${input.title} facts and evidence passed the explicit browser-test adapter.` }],
    artifact: {
      title: `Synthetic ${input.title} result`,
      subtitle: `The AI-agency interface returned a synthetic ${input.title} record for browser testing.`,
      referenceLabel: "Synthetic reference",
      referenceValue: reference,
      facts: [{ label: "Decision", value: "Approved by explicit E2E adapter", status: "verified" }],
      groups: [{ title: "Case output", items: [{ title: input.title, meta: "Synthetic browser-test output", status: "ready" }] }],
      notice: "This is a synthetic Playwright test result and is not an official government or provider record.",
    },
  };
};
