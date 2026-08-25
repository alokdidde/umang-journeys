export type NodeStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "waiting_external"
  | "completed"
  | "blocked"
  | "skipped";

export type ServiceNodeDefinition = {
  key: string;
  title: string;
  description: string;
  icon: "baby" | "certificate" | "health" | "vaccine" | "identity" | "benefits" | "vehicle" | "transfer" | "insurance" | "fastag" | "calendar";
  timing: string;
  dependsOn?: string[];
};

export type JourneyTemplate = {
  id: string;
  version: number;
  lifeEvent: "having_a_baby" | "buying_a_vehicle";
  title: string;
  nodes: ServiceNodeDefinition[];
};

export type JourneyNode = ServiceNodeDefinition & {
  status: NodeStatus;
  recommended: boolean;
};

export type JourneyProjection = {
  templateId: string;
  nodes: JourneyNode[];
  edges: { from: string; to: string }[];
};

export const newBabyTemplate: JourneyTemplate = {
  id: "new-baby.india.v1",
  version: 1,
  lifeEvent: "having_a_baby",
  title: "Having a Baby",
  nodes: [
    { key: "birth_registration", title: "Birth registration", description: "Register your baby's birth with the local authority.", icon: "baby", timing: "Complete as soon as possible" },
    { key: "birth_certificate", title: "Birth certificate", description: "Receive the child's synthetic birth record.", icon: "certificate", timing: "Ready after registration", dependsOn: ["birth_registration"] },
    { key: "child_health_record", title: "Child health record", description: "Create your child's digital health record.", icon: "health", timing: "Recommended in the first weeks", dependsOn: ["birth_registration"] },
    { key: "vaccination_timeline", title: "Vaccination timeline", description: "Plan and track essential vaccinations.", icon: "vaccine", timing: "Next milestone at 6 weeks", dependsOn: ["birth_registration"] },
    { key: "child_identity", title: "Child identity", description: "Preview identity-document next steps.", icon: "identity", timing: "Prepare after birth registration", dependsOn: ["birth_registration"] },
    { key: "eligible_benefits", title: "Eligible benefits", description: "Discover relevant family benefits.", icon: "benefits", timing: "Review within the first 90 days", dependsOn: ["birth_registration"] },
  ],
};

export const vehiclePurchaseTemplate: JourneyTemplate = {
  id: "vehicle-purchase.india.v1",
  version: 1,
  lifeEvent: "buying_a_vehicle",
  title: "Buying a Vehicle",
  nodes: [
    { key: "vehicle_details", title: "Confirm vehicle", description: "Match the vehicle and purchase details before any application is prepared.", icon: "vehicle", timing: "Start with the registration number" },
    { key: "ownership_transfer", title: "Ownership transfer", description: "Prepare and simulate the VAHAN ownership-transfer application.", icon: "transfer", timing: "Within 14 days for an in-state sale", dependsOn: ["vehicle_details"] },
    { key: "insurance_cover", title: "Insurance cover", description: "Check the policy and record the transfer or renewal action needed.", icon: "insurance", timing: "Before driving the vehicle", dependsOn: ["vehicle_details"] },
    { key: "fastag_setup", title: "FASTag setup", description: "Validate the vehicle and prepare FASTag activation.", icon: "fastag", timing: "Before the first highway trip", dependsOn: ["ownership_transfer"] },
    { key: "compliance_calendar", title: "Compliance calendar", description: "Track insurance, PUC, tax and registration milestones in one place.", icon: "calendar", timing: "Keep these dates current", dependsOn: ["ownership_transfer", "insurance_cover"] },
  ],
};

export const journeyTemplates = [newBabyTemplate, vehiclePurchaseTemplate] as const;

export function getJourneyTemplate(templateId: string) {
  return journeyTemplates.find((template) => template.id === templateId);
}

function evaluateNodes(template: JourneyTemplate, completed: Set<string>): JourneyNode[] {
  const nodes: JourneyNode[] = template.nodes.map((node) => {
    const isComplete = completed.has(node.key);
    const prerequisitesMet = (node.dependsOn ?? []).every((key) => completed.has(key));
    const status = (isComplete ? "completed" : prerequisitesMet ? "available" : "locked") as NodeStatus;
    return { ...node, status, recommended: false };
  });
  const firstAvailable = nodes.find((node) => node.status === "available");
  if (firstAvailable) {
    firstAvailable.recommended = true;
    if (completed.size === 0) firstAvailable.status = "in_progress";
  }
  return nodes;
}

export function compileJourney(template: JourneyTemplate): JourneyProjection {
  return {
    templateId: template.id,
    nodes: evaluateNodes(template, new Set()),
    edges: template.nodes.flatMap((node) => (node.dependsOn ?? []).map((from) => ({ from, to: node.key }))),
  };
}

export function completeNode(projection: JourneyProjection, nodeKey: string): JourneyProjection {
  const template = getJourneyTemplate(projection.templateId);
  if (!template) throw new Error(`Unknown journey template: ${projection.templateId}`);
  const completed = new Set(
    projection.nodes.filter((node) => node.status === "completed").map((node) => node.key),
  );
  completed.add(nodeKey);
  return { ...projection, nodes: evaluateNodes(template, completed) };
}

export function validateTemplate(template: JourneyTemplate): string[] {
  const keys = new Set(template.nodes.map((node) => node.key));
  return template.nodes.flatMap((node) =>
    (node.dependsOn ?? []).filter((dependency) => !keys.has(dependency)).map(() => node.key),
  );
}
