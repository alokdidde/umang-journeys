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
  icon: "baby" | "certificate" | "health" | "vaccine" | "identity" | "benefits" | "vehicle" | "transfer" | "insurance" | "fastag" | "calendar" | "person" | "coverage" | "scheme" | "records" | "care" | "home" | "address" | "voter" | "mail" | "business" | "store" | "tax" | "launch" | "retirement" | "pension" | "life_certificate" | "folder";
  timing: string;
  dependsOn?: string[];
};

export type JourneyTemplate = {
  id: string;
  version: number;
  lifeEvent: "having_a_baby" | "buying_a_vehicle" | "managing_health_cover" | "moving_home" | "starting_a_business" | "retirement";
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

export const healthInsuranceTemplate: JourneyTemplate = {
  id: "health-insurance.india.v1",
  version: 1,
  lifeEvent: "managing_health_cover",
  title: "Health & Insurance",
  nodes: [
    { key: "health_profile", title: "Health profile", description: "Confirm who this cover and care plan is for.", icon: "person", timing: "Start with the basics" },
    { key: "coverage_review", title: "Understand health cover", description: "Read the policy, limits, waiting periods and cashless terms.", icon: "coverage", timing: "Review before care is needed", dependsOn: ["health_profile"] },
    { key: "public_scheme_check", title: "Check public schemes", description: "Screen for a possible government health-cover pathway.", icon: "scheme", timing: "Official verification is still required", dependsOn: ["coverage_review"] },
    { key: "abha_records", title: "ABHA & health records", description: "Prepare a digital health identity and consent-aware record plan.", icon: "records", timing: "Link records only with the person’s consent", dependsOn: ["public_scheme_check"] },
    { key: "cashless_readiness", title: "Prepare for cashless care", description: "Keep the right documents and authorization steps ready.", icon: "care", timing: "Keep this pack easy to reach", dependsOn: ["abha_records"] },
  ],
};

export const movingHomeTemplate: JourneyTemplate = {
  id: "moving-home.india.v1",
  version: 1,
  lifeEvent: "moving_home",
  title: "Moving Home",
  nodes: [
    { key: "move_profile", title: "Confirm your move", description: "Check the new address, move date, and who is moving.", icon: "home", timing: "Start with the new address" },
    { key: "residence_evidence", title: "Check address evidence", description: "Read one document that supports the new address.", icon: "address", timing: "Before preparing requests", dependsOn: ["move_profile"] },
    { key: "aadhaar_address", title: "Prepare Aadhaar address update", description: "Prepare a UIDAI address-update checklist and trackable request draft.", icon: "identity", timing: "Each resident updates separately", dependsOn: ["residence_evidence"] },
    { key: "voter_address", title: "Prepare voter address update", description: "Prepare Form 8 details for shifting the electoral-roll entry.", icon: "voter", timing: "After you ordinarily reside there", dependsOn: ["aadhaar_address"] },
    { key: "move_completion_pack", title: "Finish your move checklist", description: "Organise postal, vehicle, bank, and household-service address actions.", icon: "mail", timing: "Complete after moving", dependsOn: ["voter_address"] },
  ],
};

export const businessSetupTemplate: JourneyTemplate = {
  id: "business-setup.india.v1",
  version: 1,
  lifeEvent: "starting_a_business",
  title: "Starting a Business",
  nodes: [
    { key: "business_profile", title: "Confirm the business", description: "Choose the activity, structure, premises, and expected start date.", icon: "business", timing: "Start with the business basics" },
    { key: "business_premises", title: "Check premises evidence", description: "Read the document supporting the principal place of business.", icon: "store", timing: "Before tax or local registrations", dependsOn: ["business_profile"] },
    { key: "udyam_readiness", title: "Prepare Udyam registration", description: "Check the self-declaration details for the official free MSME service.", icon: "certificate", timing: "When the enterprise is ready to register", dependsOn: ["business_premises"] },
    { key: "gst_readiness", title: "Check GST registration path", description: "Review turnover, supplies, and evidence without deciding tax liability.", icon: "tax", timing: "Verify before taxable supplies begin", dependsOn: ["udyam_readiness"] },
    { key: "business_launch_pack", title: "Build the launch checklist", description: "Organise bank, invoice, local licence, and recurring compliance actions.", icon: "launch", timing: "Before the first invoice", dependsOn: ["gst_readiness"] },
  ],
};

export const retirementTemplate: JourneyTemplate = {
  id: "retirement.india.v1",
  version: 1,
  lifeEvent: "retirement",
  title: "Retirement",
  nodes: [
    { key: "retirement_profile", title: "Confirm your retirement", description: "Check the retirement date, employment route, and pension records you hold.", icon: "retirement", timing: "Start 6 months before retirement" },
    { key: "retirement_record_review", title: "Review retirement records", description: "Read a provident-fund or pension statement and identify record gaps.", icon: "folder", timing: "Before making any claim", dependsOn: ["retirement_profile"] },
    { key: "pension_pathway", title: "Prepare pension pathways", description: "Separate EPFO, EPS, NPS, and employer actions that may apply.", icon: "pension", timing: "Official eligibility must be verified", dependsOn: ["retirement_record_review"] },
    { key: "life_certificate_readiness", title: "Plan life-certificate duties", description: "Prepare the future Jeevan Pramaan checklist only if pension begins.", icon: "life_certificate", timing: "After the pension authority requires it", dependsOn: ["pension_pathway"] },
    { key: "retirement_pack", title: "Build your retirement pack", description: "Keep claim records, contacts, dates, and verification gaps together.", icon: "folder", timing: "Review yearly", dependsOn: ["life_certificate_readiness"] },
  ],
};

export const journeyTemplates = [newBabyTemplate, vehiclePurchaseTemplate, healthInsuranceTemplate, movingHomeTemplate, businessSetupTemplate, retirementTemplate] as const;

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
