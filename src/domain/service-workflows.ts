export const sandboxServiceKeys = [
  "birth_registration",
  "birth_certificate",
  "child_health_record",
  "vaccination_timeline",
  "child_identity",
  "eligible_benefits",
  "ownership_transfer",
  "insurance_cover",
  "fastag_setup",
  "compliance_calendar",
  "coverage_review",
  "public_scheme_check",
  "abha_records",
  "cashless_readiness",
  "residence_evidence",
  "aadhaar_address",
  "voter_address",
  "move_completion_pack",
  "business_premises",
  "udyam_readiness",
  "gst_readiness",
  "business_launch_pack",
  "retirement_record_review",
  "pension_pathway",
  "life_certificate_readiness",
  "retirement_pack",
] as const;

export type SandboxServiceKey = (typeof sandboxServiceKeys)[number];
export type ServiceRunStatus = "running" | "waiting_external" | "completed" | "failed";
export type ProviderCaseStatus = "submitted" | "acknowledged" | "under_review" | "action_required" | "approved" | "rejected" | "withdrawn" | "expired" | "appealed";
export type ProviderScenario = "success" | "delayed" | "clarification" | "rejected";
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
  nodeKey: string;
  provider: string;
  status: ServiceRunStatus;
  progress: number;
  currentStage: number;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  receipt: string;
  caseStatus?: ProviderCaseStatus;
  scenario?: ProviderScenario;
  nextTransitionAt?: string;
  reasonCode?: string;
  actionMessage?: string;
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
  birth_registration: {
    agency: "Civil Registration System synthetic agency",
    agencyShort: "CRS synthetic agency",
    action: "Send for AI registry review",
    explanation: "Review the child, birth, informant, place and route details and return a synthetic registry decision based on the supplied record.",
    turnaround: "One input-driven AI review",
    dataShared: ["Child and parent details", "Birth place and date", "Informant and registration route"],
    stages: [
      { key: "review_case", title: "Case reviewed", detail: "The synthetic registry reviews the supplied facts and identifies any missing or conflicting information.", progress: 100, state: "completed" },
    ],
  },
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
    action: "Send transfer for AI review",
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
    action: "Review FASTag setup",
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
  coverage_review: {
    agency: "Health insurer policy sandbox",
    agencyShort: "Policy sandbox",
    action: "Review my health cover",
    explanation: "Read the supplied policy or scheme card and explain the cover, limits, waiting periods, exclusions, and cashless conditions without confirming a real claim.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Insured person and policy reference", "Cover and validity details", "Waiting periods, limits, and network terms"],
    stages: [
      { key: "read_cover", title: "Cover document read", detail: "The sandbox extracted the person, policy reference, validity, and sum insured.", progress: 24, state: "running" },
      { key: "match_person", title: "Insured person matched", detail: "The supplied name and date of birth matched this person’s health record.", progress: 52, state: "waiting_external" },
      { key: "explain_terms", title: "Important terms explained", detail: "Waiting periods, room limits, co-pay, exclusions, and cashless terms were separated for review.", progress: 78, state: "running" },
      { key: "publish_cover", title: "Cover summary prepared", detail: "A synthetic, plain-language coverage summary is ready.", progress: 100, state: "completed" },
    ],
  },
  public_scheme_check: {
    agency: "National Health Authority eligibility sandbox",
    agencyShort: "NHA sandbox",
    action: "Check possible scheme cover",
    explanation: "Screen the confirmed household facts against a synthetic PM-JAY pathway and clearly separate a possible match from official eligibility.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Name, state, and household size", "Existing cover status", "Household-record availability"],
    stages: [
      { key: "prepare_household", title: "Household details prepared", detail: "Only the confirmed state, household size, and record availability were used.", progress: 24, state: "running" },
      { key: "query_pathway", title: "Public-scheme pathway checked", detail: "The sandbox checked whether an official PM-JAY eligibility lookup may be useful.", progress: 52, state: "waiting_external" },
      { key: "label_uncertainty", title: "Uncertainty labelled", detail: "The result was kept as an indication because official beneficiary verification was not performed.", progress: 78, state: "running" },
      { key: "publish_guidance", title: "Verification guidance prepared", detail: "The official check options and evidence list are ready.", progress: 100, state: "completed" },
    ],
  },
  abha_records: {
    agency: "Ayushman Bharat Digital Mission sandbox",
    agencyShort: "ABDM sandbox",
    action: "Prepare ABHA & records",
    explanation: "Prepare a consent-aware ABHA and health-record checklist without creating an identity or sharing a real medical record.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Name and date of birth", "Existing ABHA status", "Evaluation-only record-sharing consent"],
    stages: [
      { key: "verify_consent", title: "Consent preference recorded", detail: "The simulation recorded permission for this evaluation run only.", progress: 24, state: "running" },
      { key: "check_existing", title: "Existing status assessed", detail: "The stated ABHA status was used without attempting a real identity lookup.", progress: 52, state: "waiting_external" },
      { key: "prepare_linking", title: "Record-linking plan prepared", detail: "Discovery, linking, viewing, and time-bound sharing were separated into clear actions.", progress: 78, state: "running" },
      { key: "publish_checklist", title: "ABHA checklist ready", detail: "A synthetic identity and records checklist is ready.", progress: 100, state: "completed" },
    ],
  },
  cashless_readiness: {
    agency: "Health claims exchange sandbox",
    agencyShort: "Claims sandbox",
    action: "Build my cashless care pack",
    explanation: "Combine the cover summary, public-scheme indication, and health-record plan into practical steps for seeking cashless care.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Coverage summary and policy reference", "Preferred care city", "Documents needed for pre-authorisation"],
    stages: [
      { key: "collect_cover", title: "Coverage records collected", detail: "The synthetic policy summary and public-scheme indication were brought together.", progress: 24, state: "running" },
      { key: "check_network", title: "Network check prepared", detail: "The sandbox prepared a hospital-network verification step without asserting empanelment.", progress: 52, state: "waiting_external" },
      { key: "assemble_documents", title: "Pre-authorisation pack assembled", detail: "Identity, policy, clinical, and provider documents were grouped by who supplies them.", progress: 78, state: "running" },
      { key: "publish_pack", title: "Care-readiness pack published", detail: "A synthetic emergency checklist and escalation path are ready.", progress: 100, state: "completed" },
    ],
  },
  residence_evidence: {
    agency: "Address evidence verification sandbox",
    agencyShort: "Address evidence sandbox",
    action: "Check address evidence",
    explanation: "Read the new-address document, compare the person and address, and identify which authorities may accept that document without calling it universal proof.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Resident name", "New address and PIN code", "Document type and date"],
    stages: [
      { key: "read_document", title: "Address document read", detail: "The sandbox extracted the resident, complete address, document type, and date.", progress: 24, state: "running" },
      { key: "match_address", title: "New address matched", detail: "The extracted address matched the move details supplied for this home.", progress: 52, state: "waiting_external" },
      { key: "compare_rules", title: "Authority rules compared", detail: "UIDAI, ECI, and vehicle-record evidence routes were kept separate.", progress: 78, state: "running" },
      { key: "publish_evidence", title: "Evidence summary prepared", detail: "A synthetic evidence summary and gaps list are ready.", progress: 100, state: "completed" },
    ],
  },
  aadhaar_address: {
    agency: "UIDAI address-update sandbox",
    agencyShort: "UIDAI sandbox",
    action: "Prepare Aadhaar update",
    explanation: "Prepare an address-update request draft and evidence checklist without authenticating Aadhaar or submitting to myAadhaar.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Masked Aadhaar status", "New address", "Selected proof-of-address document"],
    stages: [
      { key: "check_document", title: "Proof-of-address route checked", detail: "The selected document was compared with the UIDAI address-update guidance.", progress: 24, state: "running" },
      { key: "prepare_address", title: "Address fields prepared", detail: "English address fields and local-language review were separated for confirmation.", progress: 52, state: "waiting_external" },
      { key: "prepare_auth", title: "Authentication step identified", detail: "OTP or centre authentication remains an official user action.", progress: 78, state: "running" },
      { key: "publish_request", title: "Update checklist prepared", detail: "A synthetic request draft and SRN tracking checklist are ready.", progress: 100, state: "completed" },
    ],
  },
  voter_address: {
    agency: "Election Commission Form 8 sandbox",
    agencyShort: "ECI sandbox",
    action: "Prepare voter update",
    explanation: "Prepare Form 8 shifting-of-residence details and evidence without changing the electoral roll or issuing an EPIC.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Elector and EPIC status", "Present ordinary residence", "Self-attested address evidence"],
    stages: [
      { key: "check_elector", title: "Elector details checked", detail: "The sandbox recorded whether an EPIC number is available without querying the electoral roll.", progress: 24, state: "running" },
      { key: "prepare_form8", title: "Form 8 details prepared", detail: "The new ordinary-residence fields were assembled for review.", progress: 52, state: "waiting_external" },
      { key: "check_evidence", title: "Address evidence listed", detail: "Accepted Form 8 evidence options and self-attestation were identified.", progress: 78, state: "running" },
      { key: "publish_form8", title: "Voter checklist prepared", detail: "A synthetic Form 8 checklist and tracking route are ready.", progress: 100, state: "completed" },
    ],
  },
  move_completion_pack: {
    agency: "Citizen address-change coordination sandbox",
    agencyShort: "Move coordination sandbox",
    action: "Build move checklist",
    explanation: "Combine completed address preparations with postal, vehicle, bank, and household-service reminders while keeping every provider update separate.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Move date and new address", "Prepared identity and voter requests", "Household service selections"],
    stages: [
      { key: "collect_updates", title: "Prepared requests collected", detail: "Aadhaar and voter address checklists were brought together without merging their status.", progress: 24, state: "running" },
      { key: "check_postal", title: "Postal redirection reviewed", detail: "The India Post change-of-address reminder and limited validity were added.", progress: 52, state: "waiting_external" },
      { key: "build_remaining", title: "Remaining providers organised", detail: "Vehicle, bank, insurer, employer, and utilities were grouped as separate actions.", progress: 78, state: "running" },
      { key: "publish_move_pack", title: "Move pack published", detail: "A synthetic address-change pack and review dates are ready.", progress: 100, state: "completed" },
    ],
  },
  business_premises: {
    agency: "Business premises verification sandbox",
    agencyShort: "Premises sandbox",
    action: "Check premises evidence",
    explanation: "Read the principal-place document and prepare evidence combinations used by GST and local registrations without validating legal possession.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Business name and address", "Nature of possession", "Premises evidence"],
    stages: [
      { key: "read_premises", title: "Premises document read", detail: "The business or occupier, address, and possession basis were extracted.", progress: 24, state: "running" },
      { key: "match_business", title: "Business address matched", detail: "The document address matched the confirmed principal place of business.", progress: 52, state: "waiting_external" },
      { key: "compare_evidence", title: "Evidence combinations checked", detail: "Lease, consent, ownership, and utility-document paths were kept distinct.", progress: 78, state: "running" },
      { key: "publish_premises", title: "Premises summary prepared", detail: "A synthetic evidence summary and missing-item list are ready.", progress: 100, state: "completed" },
    ],
  },
  udyam_readiness: {
    agency: "Ministry of MSME Udyam sandbox",
    agencyShort: "Udyam sandbox",
    action: "Prepare Udyam registration",
    explanation: "Prepare the official free, paperless self-declaration flow without using Aadhaar OTP, PAN data, or issuing a registration number.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Enterprise and entrepreneur details", "Chosen organisation type", "Activity and location"],
    stages: [
      { key: "check_structure", title: "Organisation type checked", detail: "The Aadhaar holder required for the selected structure was identified.", progress: 24, state: "running" },
      { key: "prepare_declaration", title: "Self-declaration prepared", detail: "Enterprise, activity, and location fields were assembled without document upload.", progress: 52, state: "waiting_external" },
      { key: "flag_auth", title: "Official authentication flagged", detail: "Aadhaar OTP, PAN, and GST-linked checks remain on the official portal.", progress: 78, state: "running" },
      { key: "publish_udyam", title: "Udyam checklist prepared", detail: "A synthetic registration-readiness checklist is ready.", progress: 100, state: "completed" },
    ],
  },
  gst_readiness: {
    agency: "GST registration readiness sandbox",
    agencyShort: "GST sandbox",
    action: "Check GST registration path",
    explanation: "Screen the known turnover and supply facts, prepare the registration evidence, and keep the result as tax-registration guidance rather than a liability decision.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Business structure and PAN status", "Expected turnover and supply pattern", "Principal-place evidence"],
    stages: [
      { key: "collect_tax_facts", title: "Tax facts collected", detail: "Only confirmed turnover, supply, and location facts were used.", progress: 24, state: "running" },
      { key: "screen_registration", title: "Registration path screened", detail: "Threshold and compulsory-registration questions were separated for official advice.", progress: 52, state: "waiting_external" },
      { key: "prepare_documents", title: "GST evidence prepared", detail: "Principal-place, signatory, and entity document categories were organised.", progress: 78, state: "running" },
      { key: "publish_gst", title: "GST readiness result prepared", detail: "A synthetic readiness result and questions for a tax professional are ready.", progress: 100, state: "completed" },
    ],
  },
  business_launch_pack: {
    agency: "Business launch coordination sandbox",
    agencyShort: "Launch sandbox",
    action: "Build business launch pack",
    explanation: "Combine registration readiness with bank, invoice, local-establishment, and recurring compliance actions without declaring the business legally ready.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Business profile and start date", "Registration-readiness results", "State and premises details"],
    stages: [
      { key: "collect_readiness", title: "Registration results collected", detail: "Udyam and GST readiness were kept as separate records.", progress: 24, state: "running" },
      { key: "prepare_operations", title: "Operating basics prepared", detail: "Banking, invoices, records, and payment collection were organised.", progress: 52, state: "waiting_external" },
      { key: "flag_local", title: "Local checks identified", detail: "State and municipal establishment or trade-licence checks were marked for verification.", progress: 78, state: "running" },
      { key: "publish_launch", title: "Launch pack published", detail: "A synthetic first-90-days checklist is ready.", progress: 100, state: "completed" },
    ],
  },
  retirement_record_review: {
    agency: "Retirement records reconciliation sandbox",
    agencyShort: "Records sandbox",
    action: "Review retirement records",
    explanation: "Read the supplied retirement statement, compare the member and service facts, and identify gaps without contacting EPFO, a CRA, employer, or pension authority.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Member and account type", "Service or contribution record", "Retirement date"],
    stages: [
      { key: "read_statement", title: "Retirement statement read", detail: "The member, account type, reference, and service record were extracted.", progress: 24, state: "running" },
      { key: "match_member", title: "Member details matched", detail: "The statement matched the person confirmed for this retirement record.", progress: 52, state: "waiting_external" },
      { key: "identify_gaps", title: "Record gaps identified", detail: "Nominee, bank, identity, and employment-history checks were separated.", progress: 78, state: "running" },
      { key: "publish_record_review", title: "Record review prepared", detail: "A synthetic reconciliation summary is ready.", progress: 100, state: "completed" },
    ],
  },
  pension_pathway: {
    agency: "Pension pathway sandbox",
    agencyShort: "Pension sandbox",
    action: "Prepare pension pathways",
    explanation: "Use the confirmed employment and account facts to identify EPFO, EPS, NPS, or employer actions without recommending an investment or deciding entitlement.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Age and retirement date", "Employment sector and service", "EPFO, EPS, NPS, or employer record status"],
    stages: [
      { key: "classify_records", title: "Retirement records classified", detail: "EPF, EPS, NPS, and employer records were separated.", progress: 24, state: "running" },
      { key: "screen_claims", title: "Claim paths screened", detail: "Possible settlement, pension, or exit routes were labelled for official verification.", progress: 52, state: "waiting_external" },
      { key: "prepare_forms", title: "Claim evidence organised", detail: "Forms and supporting records were grouped by the responsible authority.", progress: 78, state: "running" },
      { key: "publish_pathways", title: "Pension pathways prepared", detail: "A synthetic pathway summary and verification questions are ready.", progress: 100, state: "completed" },
    ],
  },
  life_certificate_readiness: {
    agency: "Jeevan Pramaan readiness sandbox",
    agencyShort: "Jeevan Pramaan sandbox",
    action: "Prepare life-certificate plan",
    explanation: "Prepare a future Digital Life Certificate checklist only for a pensioner whose authority requires it; no biometric authentication is performed.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Pension start status", "Pension authority and payment record status", "Aadhaar and mobile readiness"],
    stages: [
      { key: "check_applicability", title: "Applicability checked", detail: "The sandbox kept this as a future duty unless pension has begun and the authority is onboarded.", progress: 24, state: "running" },
      { key: "prepare_identity", title: "Identity prerequisites listed", detail: "Aadhaar, mobile, PPO, bank, and authority details were organised without authentication.", progress: 52, state: "waiting_external" },
      { key: "compare_channels", title: "Submission channels compared", detail: "Face, biometric-device, CSC, bank, and post-office routes were listed.", progress: 78, state: "running" },
      { key: "publish_life_plan", title: "Life-certificate plan prepared", detail: "A synthetic future checklist and renewal reminder are ready.", progress: 100, state: "completed" },
    ],
  },
  retirement_pack: {
    agency: "Retirement transition coordination sandbox",
    agencyShort: "Retirement pack sandbox",
    action: "Build retirement pack",
    explanation: "Combine record gaps, pension pathways, contacts, and future verification dates into one planning pack without providing financial advice.",
    turnaround: "About 4 simulated checks",
    dataShared: ["Retirement record review", "Potential pension pathways", "Future verification and nominee actions"],
    stages: [
      { key: "collect_records", title: "Retirement records collected", detail: "The statement review and pension pathways were brought together.", progress: 24, state: "running" },
      { key: "organise_contacts", title: "Authority contacts organised", detail: "Employer, EPFO, NPS, bank, and pension-authority routes were separated.", progress: 52, state: "waiting_external" },
      { key: "schedule_reviews", title: "Review dates scheduled", detail: "Claim, nominee, bank, tax, and life-certificate dates were marked for verification.", progress: 78, state: "running" },
      { key: "publish_retirement_pack", title: "Retirement pack published", detail: "A synthetic transition pack is ready.", progress: 100, state: "completed" },
    ],
  },
};

export function isSandboxServiceKey(value: string): value is SandboxServiceKey {
  return sandboxServiceKeys.includes(value as SandboxServiceKey);
}

export function serviceDefinitionFor(node: { key: string; title: string; description: string; source?: { authority: string } }): ServiceWorkflowDefinition {
  if (isSandboxServiceKey(node.key)) {
    const definition = serviceWorkflowDefinitions[node.key];
    const synthetic = (value: string) => value.replaceAll(" sandbox", " synthetic agent").replaceAll("Sandbox", "Synthetic").replaceAll("sandbox", "synthetic environment");
    return {
      ...definition,
      agency: synthetic(definition.agency),
      agencyShort: synthetic(definition.agencyShort),
      explanation: synthetic(definition.explanation),
    };
  }
  return {
    agency: `${node.source?.authority ?? "Public service"} synthetic agency`,
    agencyShort: `${node.source?.authority ?? "Public service"} · synthetic`,
    action: `Send ${node.title.toLocaleLowerCase("en-IN")} for AI review`,
    explanation: `${node.description} The synthetic agency will decide from the relevant details and verified evidence currently saved here.`,
    turnaround: "One input-driven AI review",
    dataShared: ["Details relevant to this step", "Verified evidence already attached", "Your clarification or appeal, when provided"],
    stages: [],
  };
}
