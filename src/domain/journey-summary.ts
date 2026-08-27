import type { JourneyProjection, NodeStatus } from "./journey-engine";
import { getJourneyTemplate, isJourneyComplete, journeyProgressNodes } from "./journey-engine";
import type { SandboxServiceRun } from "./service-workflows";

export type ConnectedPerson = {
  entityId: string;
  displayName: string;
  isAccountHolder: boolean;
  roles: string[];
  ownershipShare?: number;
  canAct?: boolean;
};

export type JourneySubject = {
  id: string;
  type: "child" | "vehicle" | "person" | "residence" | "business";
  displayName: string;
  canonicalEntityId?: string;
  householdId?: string;
  role?: "account_holder" | "person" | "asset" | "dependent";
  context?: {
    relationshipToAccountHolder?: string;
    householdMember?: boolean;
    connectedPeople?: ConnectedPerson[];
  };
};

export type JourneyLifecycleStatus = "active" | "completed" | "abandoned";

export type SummarizableJourney = {
  id: string;
  status: JourneyLifecycleStatus;
  subject: JourneySubject;
  projection: JourneyProjection;
  facts: Record<string, string>;
  serviceRuns: Record<string, SandboxServiceRun | undefined>;
  createdAt: string;
  updatedAt: string;
};

export type JourneyNextAction = {
  nodeKey: string;
  title: string;
  description: string;
  status: Exclude<NodeStatus, "locked" | "completed" | "skipped">;
  stateLabel: string;
  timingLabel: string;
  href: string;
  progress?: number;
};

export type JourneySummary = {
  id: string;
  templateId: string;
  title: string;
  status: JourneyLifecycleStatus;
  subject: JourneySubject;
  progress: { completed: number; total: number; percent: number };
  nextAction: JourneyNextAction | null;
  updatedAt: string;
};

type JourneyActionSource = Pick<SummarizableJourney, "id" | "projection" | "facts" | "serviceRuns">;

export function journeyNodeHref(journeyId: string, nodeKey: string) {
  if (nodeKey === "birth_registration") return `/journeys/${journeyId}/birth-registration`;
  if (nodeKey === "vehicle_details") return `/journeys/${journeyId}/vehicle-details`;
  if (nodeKey === "health_profile") return `/journeys/${journeyId}/health-profile`;
  if (nodeKey === "move_profile") return `/journeys/${journeyId}/move-profile`;
  if (nodeKey === "business_profile") return `/journeys/${journeyId}/business-profile`;
  if (nodeKey === "retirement_profile") return `/journeys/${journeyId}/retirement-profile`;
  return `/journeys/${journeyId}/services/${nodeKey}`;
}

function actionStateLabel(status: JourneyNextAction["status"], progress?: number) {
  if (status === "waiting_external") return "Waiting for provider";
  if (status === "blocked") return "Needs attention";
  if (status === "in_progress") return progress ? `${progress}% complete` : "In progress";
  return "Ready to start";
}

function actionTimingLabel(nodeKey: string, fallback: string, facts: Record<string, string>) {
  if (nodeKey !== "vaccination_timeline") return fallback;
  const birthDate = new Date(facts["child.dateOfBirth"] ?? "");
  if (Number.isNaN(birthDate.valueOf())) return fallback;
  const milestone = new Date(birthDate);
  milestone.setUTCDate(milestone.getUTCDate() + 42);
  const formatted = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(milestone);
  return `6-week milestone · ${formatted}`;
}

export function selectJourneyNextAction(journey: JourneyActionSource): JourneyNextAction | null {
  if (isJourneyComplete(journey.projection)) return null;
  const candidates = journey.projection.nodes.filter(
    (node): node is typeof node & { status: JourneyNextAction["status"] } =>
      node.actionable && !["locked", "completed", "skipped"].includes(node.status),
  );
  const completionActions = candidates.filter((node) => node.contributesToCompletion);
  const actionable = completionActions.length > 0 ? completionActions : candidates;
  const nextNode =
    actionable.find((node) => node.status === "waiting_external" || node.status === "in_progress" || node.status === "blocked") ??
    actionable.find((node) => node.recommended) ??
    actionable[0];
  const nextRun = nextNode && nextNode.key in journey.serviceRuns
    ? journey.serviceRuns[nextNode.key]
    : undefined;

  return nextNode ? {
    nodeKey: nextNode.key,
    title: nextNode.title,
    description: nextNode.description,
    status: nextNode.status,
    stateLabel: actionStateLabel(nextNode.status, nextRun?.progress),
    timingLabel: actionTimingLabel(nextNode.key, nextNode.timing, journey.facts),
    href: journeyNodeHref(journey.id, nextNode.key),
    progress: nextRun?.progress,
  } : null;
}

export function buildJourneySummary(journey: SummarizableJourney): JourneySummary {
  const nextAction = selectJourneyNextAction(journey);
  const progressNodes = journeyProgressNodes(journey.projection);
  const completed = progressNodes.filter((node) => node.status === "completed" || node.status === "skipped").length;
  const total = progressNodes.length;
  const partialProgress = nextAction?.status === "in_progress" || nextAction?.status === "waiting_external"
    ? (nextAction.progress ?? 0) / 100
    : 0;

  return {
    id: journey.id,
    templateId: journey.projection.templateId,
    title: getJourneyTemplate(journey.projection.templateId)?.title ?? "UMANG Life record",
    status: isJourneyComplete(journey.projection) ? "completed" : journey.status,
    subject: journey.subject,
    progress: {
      completed,
      total,
      percent: total === 0 ? 100 : Math.round(((completed + partialProgress) / total) * 100),
    },
    nextAction,
    updatedAt: journey.updatedAt,
  };
}
