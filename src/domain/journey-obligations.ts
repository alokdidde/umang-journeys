import type { JourneyNode, JourneyProjection } from "./journey-engine";

export type ObligationStatus = "overdue" | "due" | "upcoming" | "unscheduled" | "completed";

export type JourneyObligation = {
  id: string;
  nodeKey: string;
  title: string;
  description: string;
  dueOn: string | null;
  completedOn: string | null;
  status: ObligationStatus;
  basis: string;
  source: JourneyNode["source"];
};

const DAY = 24 * 60 * 60 * 1000;

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function formatDate(date: Date | null) {
  return date?.toISOString().slice(0, 10) ?? null;
}

function addDays(value: string | undefined, days: number) {
  const date = validDate(value);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function addYears(value: string | undefined, years: number) {
  const date = validDate(value);
  if (!date) return null;
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return formatDate(date);
}

function subtractDays(value: string | undefined, days: number) {
  return addDays(value, -days);
}

function dueDate(nodeKey: string, facts: Record<string, string>): { dueOn: string | null; basis: string } {
  const explicit = facts[`obligation.${nodeKey}.dueOn`];
  if (validDate(explicit)) return { dueOn: explicit, basis: "Confirmed obligation date" };
  if (nodeKey === "birth_dose_vaccines") return { dueOn: facts["child.dateOfBirth"] ?? null, basis: facts["child.dateOfBirth"] ? "Derived from the confirmed birth date" : "Waiting for the birth date" };
  if (nodeKey === "hbnc_visits") return { dueOn: addDays(facts["child.dateOfBirth"], 42), basis: facts["child.dateOfBirth"] ? "42 days after the confirmed birth date" : "Waiting for the birth date" };
  if (nodeKey === "later_vaccine_milestones") return { dueOn: addDays(facts["child.dateOfBirth"], 273), basis: facts["child.dateOfBirth"] ? "First later milestone, 9 months after birth" : "Waiting for the birth date" };
  if (nodeKey === "biometric_update_5") return { dueOn: addYears(facts["child.dateOfBirth"], 5), basis: facts["child.dateOfBirth"] ? "The child’s 5th birthday" : "Waiting for the birth date" };
  if (nodeKey === "puc_milestone") return { dueOn: facts["vehicle.pucValidUntil"] ?? null, basis: facts["vehicle.pucValidUntil"] ? "Verified PUC validity date" : "Waiting for the PUC validity date" };
  if (nodeKey === "tax_fitness_milestone") return { dueOn: facts["vehicle.nextComplianceDueOn"] ?? null, basis: facts["vehicle.nextComplianceDueOn"] ? "Confirmed vehicle compliance date" : "Waiting for the applicable vehicle record" };
  if (nodeKey === "policy_renewal") return { dueOn: subtractDays(facts["health.validUntil"], 30), basis: facts["health.validUntil"] ? "30 days before the confirmed policy end date" : "Waiting for the policy end date" };
  if (nodeKey === "recurring_business_duties") return { dueOn: facts["business.nextFilingDueOn"] ?? null, basis: facts["business.nextFilingDueOn"] ? "Confirmed registration or filing date" : "Waiting for an active registration and filing date" };
  if (nodeKey === "life_certificate_acceptance") return { dueOn: facts["retirement.lifeCertificateDueOn"] ?? null, basis: facts["retirement.lifeCertificateDueOn"] ? "Confirmed pension-authority due date" : "Waiting for the pension authority’s schedule" };
  return { dueOn: null, basis: "Waiting for a confirmed service date" };
}

function obligationStatus(dueOn: string | null, completedOn: string | null, now: Date): ObligationStatus {
  if (completedOn) return "completed";
  const due = validDate(dueOn ?? undefined);
  if (!due) return "unscheduled";
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Math.ceil((due.valueOf() - today.valueOf()) / DAY);
  if (days < 0) return "overdue";
  if (days <= 7) return "due";
  return "upcoming";
}

export function deriveJourneyObligations(input: { projection: JourneyProjection; facts: Record<string, string>; now?: Date }): JourneyObligation[] {
  const now = input.now ?? new Date();
  const branches = new Map(input.projection.branches.map((branch) => [branch.key, branch]));
  return input.projection.nodes
    .filter((node) => node.kind === "recurring" || node.kind === "milestone")
    .filter((node) => node.applicability !== "not_applicable" && (branches.get(node.branchKey)?.active ?? false))
    .map((node) => {
      const { dueOn, basis } = dueDate(node.key, input.facts);
      const completedOn = input.facts[`obligation.${node.key}.completedOn`] ?? null;
      return {
        id: `obligation:${input.projection.templateId}:${node.key}:${dueOn ?? "pending"}`,
        nodeKey: node.key,
        title: node.title,
        description: node.description,
        dueOn,
        completedOn,
        status: obligationStatus(dueOn, completedOn, now),
        basis,
        source: node.source,
      };
    })
    .sort((left, right) => {
      const rank: Record<ObligationStatus, number> = { overdue: 0, due: 1, upcoming: 2, unscheduled: 3, completed: 4 };
      return rank[left.status] - rank[right.status] || (left.dueOn ?? "9999").localeCompare(right.dueOn ?? "9999");
    });
}
