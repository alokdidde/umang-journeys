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
  icon: "baby" | "certificate" | "health" | "vaccine" | "identity" | "benefits";
  dependsOn?: string[];
};

export type JourneyTemplate = {
  id: string;
  version: number;
  lifeEvent: "having_a_baby";
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
    { key: "birth_registration", title: "Birth registration", description: "Register your baby's birth with the local authority.", icon: "baby" },
    { key: "birth_certificate", title: "Birth certificate", description: "Receive the child's synthetic birth record.", icon: "certificate", dependsOn: ["birth_registration"] },
    { key: "child_health_record", title: "Child health record", description: "Create your child's digital health record.", icon: "health", dependsOn: ["birth_registration"] },
    { key: "vaccination_timeline", title: "Vaccination timeline", description: "Plan and track essential vaccinations.", icon: "vaccine", dependsOn: ["birth_registration"] },
    { key: "child_identity", title: "Child identity", description: "Preview identity-document next steps.", icon: "identity", dependsOn: ["birth_registration"] },
    { key: "eligible_benefits", title: "Eligible benefits", description: "Discover relevant family benefits.", icon: "benefits", dependsOn: ["birth_registration"] },
  ],
};

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
  const completed = new Set(
    projection.nodes.filter((node) => node.status === "completed").map((node) => node.key),
  );
  completed.add(nodeKey);
  return { ...projection, nodes: evaluateNodes(newBabyTemplate, completed) };
}

export function validateTemplate(template: JourneyTemplate): string[] {
  const keys = new Set(template.nodes.map((node) => node.key));
  return template.nodes.flatMap((node) =>
    (node.dependsOn ?? []).filter((dependency) => !keys.has(dependency)).map(() => node.key),
  );
}
