export type NodeStatus = "locked" | "available" | "in_progress" | "waiting_external" | "completed" | "blocked" | "skipped";

export type JourneyBranchRequirement = "required" | "optional";
export type JourneyBranchStatus = "inactive" | "locked" | "available" | "in_progress" | "blocked" | "completed";

export type JourneyBranchDefinition = {
  key: string;
  title: string;
  description: string;
  requirement: JourneyBranchRequirement;
};

export type ServiceNodeDefinition = {
  key: string;
  title: string;
  description: string;
  icon: "baby" | "certificate" | "health" | "vaccine" | "identity" | "benefits" | "vehicle" | "transfer" | "insurance" | "fastag" | "calendar" | "person" | "coverage" | "scheme" | "records" | "care" | "home" | "address" | "voter" | "mail" | "business" | "store" | "tax" | "launch" | "retirement" | "pension" | "life_certificate" | "folder";
  timing: string;
  branchKey: string;
  dependsOn?: string[];
};

export type JourneyTemplate = {
  id: string;
  version: number;
  lifeEvent: "having_a_baby" | "buying_a_vehicle" | "managing_health_cover" | "moving_home" | "starting_a_business" | "retirement";
  title: string;
  branches: JourneyBranchDefinition[];
  nodes: ServiceNodeDefinition[];
};

export type JourneyNode = ServiceNodeDefinition & { status: NodeStatus; recommended: boolean };
export type JourneyBranch = JourneyBranchDefinition & { active: boolean; status: JourneyBranchStatus };
export type JourneyProjection = {
  templateId: string;
  branches: JourneyBranch[];
  nodes: JourneyNode[];
  edges: { from: string; to: string }[];
};

export const newBabyTemplate: JourneyTemplate = {
  id: "new-baby.india.v1",
  version: 2,
  lifeEvent: "having_a_baby",
  title: "Having a Baby",
  branches: [
    { key: "birth_records", title: "Birth records", description: "Register the birth and receive the certificate.", requirement: "required" },
    { key: "child_health", title: "Child health", description: "Set up the health record and vaccination plan.", requirement: "required" },
    { key: "child_identity", title: "Child identity", description: "Prepare identity-document next steps when you need them.", requirement: "optional" },
    { key: "family_support", title: "Family support", description: "Check benefits that may apply to your family.", requirement: "optional" },
  ],
  nodes: [
    { key: "birth_registration", title: "Birth registration", description: "Register your baby's birth with the local authority.", icon: "baby", timing: "Complete as soon as possible", branchKey: "birth_records" },
    { key: "birth_certificate", title: "Birth certificate", description: "Receive the child's synthetic birth record.", icon: "certificate", timing: "Ready after registration", branchKey: "birth_records", dependsOn: ["birth_registration"] },
    { key: "child_health_record", title: "Child health record", description: "Create your child's digital health record.", icon: "health", timing: "Recommended in the first weeks", branchKey: "child_health", dependsOn: ["birth_certificate"] },
    { key: "vaccination_timeline", title: "Vaccination timeline", description: "Plan and track essential vaccinations.", icon: "vaccine", timing: "Next milestone at 6 weeks", branchKey: "child_health", dependsOn: ["birth_certificate"] },
    { key: "child_identity", title: "Child identity", description: "Preview identity-document next steps.", icon: "identity", timing: "Prepare after the birth certificate", branchKey: "child_identity", dependsOn: ["birth_certificate"] },
    { key: "eligible_benefits", title: "Eligible benefits", description: "Discover relevant family benefits.", icon: "benefits", timing: "Review within the first 90 days", branchKey: "family_support", dependsOn: ["birth_certificate"] },
  ],
};

export const vehiclePurchaseTemplate: JourneyTemplate = {
  id: "vehicle-purchase.india.v1",
  version: 2,
  lifeEvent: "buying_a_vehicle",
  title: "Buying a Vehicle",
  branches: [
    { key: "vehicle_record", title: "Vehicle record", description: "Confirm the vehicle that this journey follows.", requirement: "required" },
    { key: "ownership", title: "Ownership", description: "Prepare the ownership transfer.", requirement: "required" },
    { key: "protection", title: "Insurance", description: "Confirm the cover needed before driving.", requirement: "required" },
    { key: "road_readiness", title: "Road readiness", description: "Keep recurring compliance dates together.", requirement: "required" },
    { key: "tolling", title: "Toll access", description: "Add FASTag preparation if you expect highway travel.", requirement: "optional" },
  ],
  nodes: [
    { key: "vehicle_details", title: "Confirm vehicle", description: "Match the vehicle and purchase details before any application is prepared.", icon: "vehicle", timing: "Start with the registration number", branchKey: "vehicle_record" },
    { key: "ownership_transfer", title: "Ownership transfer", description: "Prepare and simulate the VAHAN ownership-transfer application.", icon: "transfer", timing: "Within 14 days for an in-state sale", branchKey: "ownership", dependsOn: ["vehicle_details"] },
    { key: "insurance_cover", title: "Insurance cover", description: "Check the policy and record the transfer or renewal action needed.", icon: "insurance", timing: "Before driving the vehicle", branchKey: "protection", dependsOn: ["vehicle_details"] },
    { key: "fastag_setup", title: "FASTag setup", description: "Validate the vehicle and prepare FASTag activation.", icon: "fastag", timing: "Before the first highway trip", branchKey: "tolling", dependsOn: ["ownership_transfer"] },
    { key: "compliance_calendar", title: "Compliance calendar", description: "Track insurance, PUC, tax and registration milestones in one place.", icon: "calendar", timing: "Keep these dates current", branchKey: "road_readiness", dependsOn: ["ownership_transfer", "insurance_cover"] },
  ],
};

export const healthInsuranceTemplate: JourneyTemplate = {
  id: "health-insurance.india.v1",
  version: 2,
  lifeEvent: "managing_health_cover",
  title: "Health & Insurance",
  branches: [
    { key: "person_profile", title: "Person", description: "Confirm whose cover and care this journey follows.", requirement: "required" },
    { key: "cover_readiness", title: "Cover readiness", description: "Understand current cover and prepare for cashless care.", requirement: "required" },
    { key: "public_cover", title: "Public schemes", description: "Check a possible government cover pathway.", requirement: "optional" },
    { key: "digital_records", title: "Digital records", description: "Prepare ABHA and consent-aware record linking.", requirement: "optional" },
  ],
  nodes: [
    { key: "health_profile", title: "Health profile", description: "Confirm who this cover and care plan is for.", icon: "person", timing: "Start with the basics", branchKey: "person_profile" },
    { key: "coverage_review", title: "Understand health cover", description: "Read the policy, limits, waiting periods and cashless terms.", icon: "coverage", timing: "Review before care is needed", branchKey: "cover_readiness", dependsOn: ["health_profile"] },
    { key: "public_scheme_check", title: "Check public schemes", description: "Screen for a possible government health-cover pathway.", icon: "scheme", timing: "Official verification is still required", branchKey: "public_cover", dependsOn: ["health_profile"] },
    { key: "abha_records", title: "ABHA & health records", description: "Prepare a digital health identity and consent-aware record plan.", icon: "records", timing: "Link records only with the person’s consent", branchKey: "digital_records", dependsOn: ["health_profile"] },
    { key: "cashless_readiness", title: "Prepare for cashless care", description: "Keep the right documents and authorization steps ready.", icon: "care", timing: "Keep this pack easy to reach", branchKey: "cover_readiness", dependsOn: ["coverage_review"] },
  ],
};

export const movingHomeTemplate: JourneyTemplate = {
  id: "moving-home.india.v1",
  version: 2,
  lifeEvent: "moving_home",
  title: "Moving Home",
  branches: [
    { key: "move_core", title: "Move essentials", description: "Confirm the move, evidence, and final checklist.", requirement: "required" },
    { key: "identity_updates", title: "Identity updates", description: "Add this branch to prepare both Aadhaar and voter-record changes.", requirement: "optional" },
  ],
  nodes: [
    { key: "move_profile", title: "Confirm your move", description: "Check the new address, move date, and who is moving.", icon: "home", timing: "Start with the new address", branchKey: "move_core" },
    { key: "residence_evidence", title: "Check address evidence", description: "Read one document that supports the new address.", icon: "address", timing: "Before preparing requests", branchKey: "move_core", dependsOn: ["move_profile"] },
    { key: "aadhaar_address", title: "Prepare Aadhaar address update", description: "Prepare a UIDAI address-update checklist and trackable request draft.", icon: "identity", timing: "Each resident updates separately", branchKey: "identity_updates", dependsOn: ["residence_evidence"] },
    { key: "voter_address", title: "Prepare voter address update", description: "Prepare Form 8 details for shifting the electoral-roll entry.", icon: "voter", timing: "After you ordinarily reside there", branchKey: "identity_updates", dependsOn: ["aadhaar_address"] },
    { key: "move_completion_pack", title: "Finish your move checklist", description: "Organise postal, vehicle, bank, and household-service address actions.", icon: "mail", timing: "Complete after moving", branchKey: "move_core", dependsOn: ["residence_evidence"] },
  ],
};

export const businessSetupTemplate: JourneyTemplate = {
  id: "business-setup.india.v1",
  version: 2,
  lifeEvent: "starting_a_business",
  title: "Starting a Business",
  branches: [
    { key: "launch_core", title: "Launch essentials", description: "Confirm the business, premises, and operating checklist.", requirement: "required" },
    { key: "formal_registrations", title: "Formal registrations", description: "Add this branch to prepare Udyam and then review the GST path.", requirement: "optional" },
  ],
  nodes: [
    { key: "business_profile", title: "Confirm the business", description: "Choose the activity, structure, premises, and expected start date.", icon: "business", timing: "Start with the business basics", branchKey: "launch_core" },
    { key: "business_premises", title: "Check premises evidence", description: "Read the document supporting the principal place of business.", icon: "store", timing: "Before tax or local registrations", branchKey: "launch_core", dependsOn: ["business_profile"] },
    { key: "udyam_readiness", title: "Prepare Udyam registration", description: "Check the self-declaration details for the official free MSME service.", icon: "certificate", timing: "When the enterprise is ready to register", branchKey: "formal_registrations", dependsOn: ["business_premises"] },
    { key: "gst_readiness", title: "Check GST registration path", description: "Review turnover, supplies, and evidence without deciding tax liability.", icon: "tax", timing: "Verify before taxable supplies begin", branchKey: "formal_registrations", dependsOn: ["udyam_readiness"] },
    { key: "business_launch_pack", title: "Build the launch checklist", description: "Organise bank, invoice, local licence, and recurring compliance actions.", icon: "launch", timing: "Before the first invoice", branchKey: "launch_core", dependsOn: ["business_premises"] },
  ],
};

export const retirementTemplate: JourneyTemplate = {
  id: "retirement.india.v1",
  version: 2,
  lifeEvent: "retirement",
  title: "Retirement",
  branches: [
    { key: "retirement_core", title: "Retirement essentials", description: "Review records, pension paths, and the retirement pack.", requirement: "required" },
    { key: "ongoing_pension", title: "Ongoing pension duties", description: "Add life-certificate preparation when a pension authority requires it.", requirement: "optional" },
  ],
  nodes: [
    { key: "retirement_profile", title: "Confirm your retirement", description: "Check the retirement date, employment route, and pension records you hold.", icon: "retirement", timing: "Start 6 months before retirement", branchKey: "retirement_core" },
    { key: "retirement_record_review", title: "Review retirement records", description: "Read a provident-fund or pension statement and identify record gaps.", icon: "folder", timing: "Before making any claim", branchKey: "retirement_core", dependsOn: ["retirement_profile"] },
    { key: "pension_pathway", title: "Prepare pension pathways", description: "Separate EPFO, EPS, NPS, and employer actions that may apply.", icon: "pension", timing: "Official eligibility must be verified", branchKey: "retirement_core", dependsOn: ["retirement_record_review"] },
    { key: "life_certificate_readiness", title: "Plan life-certificate duties", description: "Prepare the future Jeevan Pramaan checklist only if pension begins.", icon: "life_certificate", timing: "After the pension authority requires it", branchKey: "ongoing_pension", dependsOn: ["pension_pathway"] },
    { key: "retirement_pack", title: "Build your retirement pack", description: "Keep claim records, contacts, dates, and verification gaps together.", icon: "folder", timing: "Review yearly", branchKey: "retirement_core", dependsOn: ["pension_pathway"] },
  ],
};

export const journeyTemplates = [newBabyTemplate, vehiclePurchaseTemplate, healthInsuranceTemplate, movingHomeTemplate, businessSetupTemplate, retirementTemplate] as const;

export function getJourneyTemplate(templateId: string) {
  return journeyTemplates.find((template) => template.id === templateId);
}

const runtimeStatuses = new Set<NodeStatus>(["in_progress", "waiting_external", "blocked"]);

function branchStatus(definition: JourneyBranchDefinition, active: boolean, nodes: JourneyNode[]): JourneyBranchStatus {
  if (!active) return "inactive";
  const members = nodes.filter((node) => node.branchKey === definition.key);
  if (members.length > 0 && members.every((node) => node.status === "completed" || node.status === "skipped")) return "completed";
  if (members.some((node) => node.status === "blocked")) return "blocked";
  if (members.some((node) => node.status === "in_progress" || node.status === "waiting_external" || node.status === "completed")) return "in_progress";
  if (members.some((node) => node.status === "available")) return "available";
  return "locked";
}

function evaluateJourney(template: JourneyTemplate, completed: Set<string>, activeBranchKeys: Set<string>, previousStatuses = new Map<string, NodeStatus>()): Pick<JourneyProjection, "nodes" | "branches"> {
  const active = new Set([...template.branches.filter((branch) => branch.requirement === "required").map((branch) => branch.key), ...activeBranchKeys]);
  const nodes: JourneyNode[] = template.nodes.map((node) => {
    const previous = previousStatuses.get(node.key);
    const status: NodeStatus = completed.has(node.key)
      ? "completed"
      : !active.has(node.branchKey)
        ? "locked"
        : previous && runtimeStatuses.has(previous)
          ? previous
          : !(node.dependsOn ?? []).every((key) => completed.has(key))
            ? "locked"
            : "available";
    return { ...node, status, recommended: false };
  });
  const firstAvailable = nodes.find((node) => node.status === "available");
  if (firstAvailable) {
    firstAvailable.recommended = true;
    if (completed.size === 0) firstAvailable.status = "in_progress";
  }
  const branches = template.branches.map((branch) => {
    const isActive = active.has(branch.key);
    return { ...branch, active: isActive, status: branchStatus(branch, isActive, nodes) };
  });
  return { nodes, branches };
}

function edgesFor(template: JourneyTemplate) {
  return template.nodes.flatMap((node) => (node.dependsOn ?? []).map((from) => ({ from, to: node.key })));
}

export function compileJourney(template: JourneyTemplate): JourneyProjection {
  const evaluated = evaluateJourney(template, new Set(), new Set());
  return { templateId: template.id, ...evaluated, edges: edgesFor(template) };
}

export function hydrateJourney(template: JourneyTemplate, storedNodes: Array<{ key: string; status: NodeStatus }>, activeBranchKeys: Iterable<string> = []): JourneyProjection {
  const completed = new Set(storedNodes.filter((node) => node.status === "completed").map((node) => node.key));
  const previousStatuses = new Map(storedNodes.map((node) => [node.key, node.status]));
  const inferredActiveBranches = template.branches
    .filter((branch) => branch.requirement === "optional")
    .filter((branch) => storedNodes.some((node) => template.nodes.find((definition) => definition.key === node.key)?.branchKey === branch.key && node.status !== "locked"))
    .map((branch) => branch.key);
  const evaluated = evaluateJourney(template, completed, new Set([...activeBranchKeys, ...inferredActiveBranches]), previousStatuses);
  return { templateId: template.id, ...evaluated, edges: edgesFor(template) };
}

export function activateBranch(projection: JourneyProjection, branchKey: string): JourneyProjection {
  const template = getJourneyTemplate(projection.templateId);
  if (!template) throw new Error(`Unknown journey template: ${projection.templateId}`);
  if (!template.branches.some((branch) => branch.key === branchKey)) throw new Error(`Unknown journey branch: ${branchKey}`);
  const completed = new Set(projection.nodes.filter((node) => node.status === "completed").map((node) => node.key));
  const previousStatuses = new Map(projection.nodes.map((node) => [node.key, node.status]));
  const activeBranchKeys = new Set(projection.branches.filter((branch) => branch.active).map((branch) => branch.key));
  activeBranchKeys.add(branchKey);
  const evaluated = evaluateJourney(template, completed, activeBranchKeys, previousStatuses);
  return { ...projection, ...evaluated };
}

export function completeNode(projection: JourneyProjection, nodeKey: string): JourneyProjection {
  const template = getJourneyTemplate(projection.templateId);
  if (!template) throw new Error(`Unknown journey template: ${projection.templateId}`);
  const completed = new Set(projection.nodes.filter((node) => node.status === "completed").map((node) => node.key));
  completed.add(nodeKey);
  const previousStatuses = new Map(projection.nodes.map((node) => [node.key, node.status]));
  const activeBranchKeys = new Set(projection.branches.filter((branch) => branch.active).map((branch) => branch.key));
  const evaluated = evaluateJourney(template, completed, activeBranchKeys, previousStatuses);
  return { ...projection, ...evaluated };
}

export function isJourneyComplete(projection: JourneyProjection) {
  return projection.branches.filter((branch) => branch.requirement === "required" || branch.active).every((branch) => branch.status === "completed");
}

export function journeyProgressNodes(projection: JourneyProjection) {
  const included = new Set(projection.branches.filter((branch) => branch.requirement === "required" || branch.active).map((branch) => branch.key));
  return projection.nodes.filter((node) => included.has(node.branchKey));
}

export function validateTemplate(template: JourneyTemplate): string[] {
  const nodeKeys = new Set(template.nodes.map((node) => node.key));
  const branchKeys = new Set(template.branches.map((branch) => branch.key));
  const errors: string[] = [];
  for (const node of template.nodes) {
    if (!branchKeys.has(node.branchKey)) errors.push(`${node.key}:missing_branch`);
    for (const dependency of node.dependsOn ?? []) if (!nodeKeys.has(dependency)) errors.push(`${node.key}:missing_dependency`);
  }
  for (const key of nodeKeys) if (template.nodes.filter((node) => node.key === key).length > 1) errors.push(`${key}:duplicate_node`);
  for (const key of branchKeys) if (template.branches.filter((branch) => branch.key === key).length > 1) errors.push(`${key}:duplicate_branch`);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const nodeByKey = new Map(template.nodes.map((node) => [node.key, node]));
  function visit(key: string) {
    if (visited.has(key)) return;
    visiting.add(key);
    for (const dependency of nodeByKey.get(key)?.dependsOn ?? []) {
      if (!nodeByKey.has(dependency)) continue;
      if (visiting.has(dependency)) errors.push(`${dependency}:cycle`);
      else visit(dependency);
    }
    visiting.delete(key);
    visited.add(key);
  }
  for (const key of nodeKeys) visit(key);
  return errors;
}
