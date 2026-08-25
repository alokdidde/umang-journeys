export const sandboxServiceKeys = [
  "birth_certificate",
  "child_health_record",
  "vaccination_timeline",
  "child_identity",
  "eligible_benefits",
  "ownership_transfer",
  "insurance_cover",
  "fastag_setup",
  "compliance_calendar",
] as const;

export type SandboxServiceKey = (typeof sandboxServiceKeys)[number];
export type ServiceRunStatus = "running" | "waiting_external" | "completed" | "failed";
export type ArtifactItemStatus = "verified" | "ready" | "due" | "upcoming" | "review" | "information";

export type ServiceEvent = {
  stageKey: string;
  title: string;
  detail: string;
  occurredAt: string;
};

export type ServiceArtifact = {
  title: string;
  subtitle: string;
  referenceLabel: string;
  referenceValue: string;
  facts: Array<{ label: string; value: string; status?: ArtifactItemStatus }>;
  groups: Array<{
    title: string;
    description?: string;
    items: Array<{ title: string; meta: string; detail?: string; status: ArtifactItemStatus }>;
  }>;
  notice: string;
};

export type SandboxServiceRun = {
  runId: string;
  nodeKey: SandboxServiceKey;
  provider: string;
  status: ServiceRunStatus;
  progress: number;
  currentStage: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  receipt: string;
  events: ServiceEvent[];
  artifact?: ServiceArtifact;
};

export type ServiceWorkflowDefinition = {
  agency: string;
  agencyShort: string;
  action: string;
  explanation: string;
  turnaround: string;
  dataShared: string[];
  stages: Array<{
    key: string;
    title: string;
    detail: string;
    progress: number;
    state: Exclude<ServiceRunStatus, "failed">;
  }>;
};

export const serviceWorkflowDefinitions: Record<SandboxServiceKey, ServiceWorkflowDefinition> = {
  birth_certificate: {
    agency: "Civil Registration System sandbox",
    agencyShort: "CRS sandbox",
    action: "Generate certificate",
    explanation: "Validate the registered birth, route an issuance request, digitally sign the record, and publish a watermarked copy.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Birth registration number", "Child’s name and birth date", "Place of birth"],
    stages: [
      { key: "validate_registration", title: "Registration validated", detail: "The sandbox registry found the matching birth registration.", progress: 24, state: "running" },
      { key: "request_issuance", title: "Issuance request accepted", detail: "The request entered the civil registry document queue.", progress: 52, state: "waiting_external" },
      { key: "sign_document", title: "Certificate signed", detail: "A sandbox authority signature and verification reference were applied.", progress: 78, state: "running" },
      { key: "publish_copy", title: "Digital copy published", detail: "The watermarked certificate is ready to download.", progress: 100, state: "completed" },
    ],
  },
  child_health_record: {
    agency: "Ayushman Bharat Digital Mission sandbox",
    agencyShort: "ABDM sandbox",
    action: "Create health record",
    explanation: "Prepare a consent-aware child health profile and a sandbox ABHA-style identifier without creating a real health account.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Child’s demographic details", "Guardian relationship", "Birth record reference"],
    stages: [
      { key: "verify_consent", title: "Guardian consent checked", detail: "The simulation recorded guardian authority for this child profile.", progress: 24, state: "running" },
      { key: "match_demographics", title: "Demographics matched", detail: "Name, birth date, and place were checked against the birth record.", progress: 52, state: "waiting_external" },
      { key: "reserve_identifier", title: "Sandbox health ID reserved", detail: "ABDM sandbox returned a non-production 14-digit identifier.", progress: 78, state: "running" },
      { key: "link_record", title: "Health record linked", detail: "The newborn profile and birth summary are available in the sandbox record.", progress: 100, state: "completed" },
    ],
  },
  vaccination_timeline: {
    agency: "U-WIN immunisation sandbox",
    agencyShort: "U-WIN sandbox",
    action: "Build vaccination timeline",
    explanation: "Calculate age-based due dates, distinguish unknown birth doses from upcoming vaccines, and prepare reminder-ready milestones.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Child’s date of birth", "State and district", "Existing vaccination status: unknown"],
    stages: [
      { key: "validate_birth_date", title: "Birth date validated", detail: "The schedule anchor date passed format and age checks.", progress: 24, state: "running" },
      { key: "load_schedule", title: "National schedule loaded", detail: "The sandbox loaded age-based childhood immunisation milestones.", progress: 52, state: "waiting_external" },
      { key: "calculate_due_dates", title: "Due dates calculated", detail: "Milestones were calculated without assuming any vaccine was administered.", progress: 78, state: "running" },
      { key: "publish_timeline", title: "Timeline published", detail: "The schedule is ready for review and reminder setup.", progress: 100, state: "completed" },
    ],
  },
  child_identity: {
    agency: "UIDAI enrolment guidance sandbox",
    agencyShort: "Identity sandbox",
    action: "Prepare identity checklist",
    explanation: "Assess newborn enrolment readiness and prepare an age-aware checklist without submitting an Aadhaar application.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Child’s name and birth date", "Birth certificate status", "Guardian relationship"],
    stages: [
      { key: "verify_birth_record", title: "Birth record checked", detail: "The issued sandbox certificate can support the identity checklist.", progress: 24, state: "running" },
      { key: "apply_age_rules", title: "Under-five rules applied", detail: "The checklist was adapted for a newborn enrolment pathway.", progress: 52, state: "waiting_external" },
      { key: "check_documents", title: "Documents assessed", detail: "Available and still-needed guardian documents were separated.", progress: 78, state: "running" },
      { key: "prepare_guidance", title: "Enrolment guidance prepared", detail: "A centre-visit checklist and future biometric reminder are ready.", progress: 100, state: "completed" },
    ],
  },
  eligible_benefits: {
    agency: "Government benefits catalogue sandbox",
    agencyShort: "Benefits sandbox",
    action: "Match family benefits",
    explanation: "Screen central and Telangana programmes, explain each match, and identify missing evidence without making an eligibility decision.",
    turnaround: "About 4 simulated checks",
    dataShared: ["State and place of birth", "Hospital type: unconfirmed", "Household eligibility details: incomplete"],
    stages: [
      { key: "normalize_profile", title: "Family profile normalised", detail: "Known location and birth facts were prepared for scheme screening.", progress: 24, state: "running" },
      { key: "query_catalogue", title: "Programme catalogue checked", detail: "Central and Telangana maternal-child programmes were queried.", progress: 52, state: "waiting_external" },
      { key: "screen_rules", title: "Rules screened", detail: "Matches were labelled with evidence gaps instead of assumed eligible.", progress: 78, state: "running" },
      { key: "explain_matches", title: "Matches explained", detail: "Potential programmes and clear next checks are ready for review.", progress: 100, state: "completed" },
    ],
  },
  ownership_transfer: {
    agency: "VAHAN ownership sandbox",
    agencyShort: "VAHAN sandbox",
    action: "Submit transfer simulation",
    explanation: "Validate the RC and sale documents, prepare Form 29/30 data, and simulate an ownership-transfer submission without contacting an RTO.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Vehicle registration and chassis suffix", "Buyer and seller details", "RC and sale agreement evidence"],
    stages: [
      { key: "validate_rc", title: "Registration certificate validated", detail: "The uploaded RC matched the vehicle registration and chassis suffix.", progress: 24, state: "running" },
      { key: "prepare_forms", title: "Transfer forms prepared", detail: "Sandbox Form 29 and Form 30 data were assembled for the in-state sale.", progress: 52, state: "waiting_external" },
      { key: "check_dues", title: "VAHAN checks completed", detail: "The simulation checked tax, hypothecation, insurance and PUC flags.", progress: 78, state: "running" },
      { key: "acknowledge_transfer", title: "Transfer request acknowledged", detail: "A synthetic VAHAN acknowledgement was issued for evaluation.", progress: 100, state: "completed" },
    ],
  },
  insurance_cover: {
    agency: "Motor insurance verification sandbox",
    agencyShort: "Insurance sandbox",
    action: "Verify insurance cover",
    explanation: "Read the policy evidence, match it to the vehicle, and identify whether an endorsement or renewal is needed.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Vehicle registration number", "Insurer and policy number", "Policy validity dates"],
    stages: [
      { key: "read_policy", title: "Policy document read", detail: "The sandbox extracted the vehicle, insurer and validity dates.", progress: 24, state: "running" },
      { key: "match_vehicle", title: "Vehicle matched", detail: "Registration and make/model matched the confirmed vehicle.", progress: 52, state: "waiting_external" },
      { key: "assess_transfer", title: "Ownership endorsement assessed", detail: "The policy was checked for the change-of-owner action required.", progress: 78, state: "running" },
      { key: "publish_cover", title: "Coverage action published", detail: "A synthetic coverage summary and reminder were created.", progress: 100, state: "completed" },
    ],
  },
  fastag_setup: {
    agency: "IHMCL issuer sandbox",
    agencyShort: "FASTag sandbox",
    action: "Activate sandbox FASTag",
    explanation: "Use VAHAN-validated vehicle details and a verified mobile number to simulate a new FASTag activation.",
    turnaround: "About 4 simulated checks",
    dataShared: ["VAHAN registration match", "Vehicle class", "Masked mobile number and selected issuer"],
    stages: [
      { key: "match_vahan", title: "VAHAN details matched", detail: "Pre-activation validation matched the registration and vehicle class.", progress: 24, state: "running" },
      { key: "verify_mobile", title: "Mobile verified", detail: "A sandbox OTP confirmed the masked contact number.", progress: 52, state: "waiting_external" },
      { key: "issue_tag", title: "Tag issued", detail: "The selected issuer reserved a synthetic tag identifier.", progress: 78, state: "running" },
      { key: "activate_tag", title: "FASTag activated", detail: "The tag was linked to the vehicle in the isolated evaluation environment.", progress: 100, state: "completed" },
    ],
  },
  compliance_calendar: {
    agency: "Parivahan compliance sandbox",
    agencyShort: "Compliance sandbox",
    action: "Build compliance calendar",
    explanation: "Combine registration, insurance, PUC and tax facts into a dated vehicle compliance plan.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Registration and purchase dates", "Insurance validity", "PUC and tax status"],
    stages: [
      { key: "collect_records", title: "Vehicle records collected", detail: "Available VAHAN, policy and evidence facts were brought together.", progress: 24, state: "running" },
      { key: "check_validity", title: "Validity dates checked", detail: "Insurance, PUC, tax and registration dates were normalised.", progress: 52, state: "waiting_external" },
      { key: "calculate_actions", title: "Next actions calculated", detail: "Due and upcoming obligations were separated without assuming compliance.", progress: 78, state: "running" },
      { key: "publish_calendar", title: "Calendar published", detail: "A synthetic compliance calendar and reminder plan are ready.", progress: 100, state: "completed" },
    ],
  },
};

export function isSandboxServiceKey(value: string): value is SandboxServiceKey {
  return sandboxServiceKeys.includes(value as SandboxServiceKey);
}
