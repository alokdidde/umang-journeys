import type { ExternalAgencyAgent } from "@/server/integrations/external-agency-agent";

export const approvedTestAgencyAgent: ExternalAgencyAgent = async (input) => ({
  outcome: "approved",
  progress: 100,
  summary: `The synthetic ${input.title} case passed the supplied test record.`,
  reasonCode: null,
  actionMessage: null,
  reference: `SYN-TEST-${input.nodeKey.replaceAll("_", "-").toUpperCase()}`,
  events: [{ stageKey: "case_reviewed", title: "Synthetic case reviewed", detail: `The supplied ${input.title} facts and evidence were reviewed.` }],
  artifact: {
    title: `Synthetic ${input.title} result`,
    subtitle: `A synthetic ${input.title} record is ready for test verification.`,
    referenceLabel: "Synthetic reference",
    referenceValue: `SYN-TEST-${input.nodeKey.replaceAll("_", "-").toUpperCase()}`,
    facts: input.nodeKey === "vaccination_timeline" && input.facts["vaccination.last.vaccine"]
      ? [{ label: "Recorded dose", value: `${input.facts["vaccination.last.vaccine"]} · ${new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${input.facts["vaccination.last.administeredOn"]}T00:00:00.000Z`))}`, status: "verified" }]
      : [{ label: "Decision", value: "Approved in test adapter", status: "verified" }],
    groups: [{ title: "Result", items: [{ title: input.title, meta: "Synthetic test output", status: "ready" }] }],
    notice: "This is a synthetic test result and is not an official record.",
  },
});
