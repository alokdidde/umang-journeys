export type NodeStatus = "locked" | "available" | "in_progress" | "waiting_external" | "completed" | "blocked" | "skipped";

export type JourneyBranchRequirement = "required" | "conditional" | "optional";
export type JourneyBranchStatus = "inactive" | "awaiting_context" | "not_applicable" | "locked" | "available" | "in_progress" | "blocked" | "completed";
export type JourneyApplicability = "applicable" | "pending" | "not_applicable";
export type JourneyNodeKind = "task" | "decision" | "external_decision" | "milestone" | "recurring";
export type JourneyNodeAction = "workflow" | "official_resource" | "none";
export type JourneyEdgeType = "hard" | "activates" | "alternative" | "parallel" | "recurs";

export type JourneyFactPredicate = {
  factKey: string;
  operator: "equals" | "not_equals" | "one_of" | "exists" | "gte" | "lt";
  value?: string | string[] | number;
};

export type JourneyGateDefinition = {
  all?: JourneyFactPredicate[];
  any?: JourneyFactPredicate[];
};

export type JourneyServiceSource = {
  authority: string;
  jurisdiction: "india" | "telangana" | "hyderabad";
  href: string;
  verifiedOn: string;
};

export type JourneyBranchDefinition = {
  key: string;
  title: string;
  description: string;
  requirement: JourneyBranchRequirement;
  gate?: JourneyGateDefinition;
};

export type ServiceNodeDefinition = {
  key: string;
  title: string;
  description: string;
  /** A Lucide icon name. DynamicIcon renders every value as an inline SVG. */
  icon: string;
  timing: string;
  branchKey: string;
  dependsOn?: string[];
  dependsOnAny?: string[];
  gate?: JourneyGateDefinition;
  kind?: JourneyNodeKind;
  action?: JourneyNodeAction;
  countsTowardCompletion?: boolean;
  source?: JourneyServiceSource;
};

export type JourneyEdgeDefinition = {
  from: string;
  to: string;
  type: JourneyEdgeType;
  label?: string;
};

export type JourneyTemplate = {
  id: string;
  version: number;
  lifeEvent: "having_a_baby" | "buying_a_vehicle" | "managing_health_cover" | "moving_home" | "starting_a_business" | "retirement";
  title: string;
  branches: JourneyBranchDefinition[];
  nodes: ServiceNodeDefinition[];
  edges?: JourneyEdgeDefinition[];
};

export type JourneyNode = ServiceNodeDefinition & {
  status: NodeStatus;
  recommended: boolean;
  applicability: JourneyApplicability;
  actionable: boolean;
  contributesToCompletion: boolean;
};
export type JourneyBranch = JourneyBranchDefinition & { active: boolean; applicability: JourneyApplicability; status: JourneyBranchStatus };
export type JourneyProjection = {
  templateId: string;
  templateVersion: number;
  branches: JourneyBranch[];
  nodes: JourneyNode[];
  edges: JourneyEdgeDefinition[];
};

const verifiedOn = "2026-08-26";
const source = (authority: string, jurisdiction: JourneyServiceSource["jurisdiction"], href: string): JourneyServiceSource => ({ authority, jurisdiction, href, verifiedOn });

const officialSources = {
  ghmcBirth: source("Greater Hyderabad Municipal Corporation", "hyderabad", "https://ghmc.gov.in/Birth.aspx"),
  birthAct: source("Office of the Registrar General, India", "india", "https://www.indiacode.nic.in/handle/123456789/1682?locale=en"),
  immunization: source("Ministry of Health and Family Welfare", "india", "https://www.mohfw.gov.in/sites/default/files/National%20Immunization%20Schedule.pdf"),
  uwin: source("Ministry of Health and Family Welfare", "india", "https://uwindashboard.mohfw.gov.in/assets/pdf/Self_Registration_Module_U-WIN_SOP_v2_Apr_2024-1.pdf"),
  childHealth: source("National Health Mission", "india", "https://nhm.gov.in/index1.php?lang=1&level=0&lid=773&linkid=499"),
  uidaiChild: source("Unique Identification Authority of India", "india", "https://www.uidai.gov.in/en/contact-support/have-any-question/299-faqs/enrolment-update/enrolling-children.html"),
  pmmvy: source("Ministry of Women and Child Development", "india", "https://www.spniwcd.wcd.gov.in/pradhan-mantri-matru-vandana-yojna/faqs"),
  sukanya: source("National Savings Institute", "india", "https://www.nsiindia.gov.in/writereaddata/SchemeRules/SukanyaSamriddhiAccountSchemeRule.pdf"),
  parivahan: source("Ministry of Road Transport and Highways", "india", "https://mparivahan.parivahan.gov.in/mstatic/english/rc-info-ownership.html"),
  telanganaTransport: source("Telangana Transport Department", "telangana", "https://www.transport.telangana.gov.in/html/registration-ownershiptransfer-normal.html"),
  irdaiMotor: source("Insurance Regulatory and Development Authority of India", "india", "https://irdai.gov.in/web/policy-holder/motor-insurance"),
  fastag: source("Indian Highways Management Company Limited", "india", "https://ihmcl.co.in/faq/"),
  echallan: source("Ministry of Road Transport and Highways", "india", "https://echallan.parivahan.gov.in/index/check-challan-status"),
  abdm: source("National Health Authority", "india", "https://abdm.gov.in/citizens"),
  pmjay: source("National Health Authority", "india", "https://nha.gov.in/img/resources/Adhikar-Patra.pdf"),
  seniorPmjay: source("National Health Authority", "india", "https://nha.gov.in/img/resources/English_FAQs_related_to_the_benefits_for_senior_citizens.pdf"),
  aarogyasri: source("Aarogyasri Health Care Trust", "telangana", "https://aarogyasri.telangana.gov.in/"),
  esic: source("Employees' State Insurance Corporation", "india", "https://www.esic.gov.in/attachments/files/faq.pdf"),
  irdaiHealth: source("Insurance Regulatory and Development Authority of India", "india", "https://irdai.gov.in/health-dept"),
  bima: source("Insurance Regulatory and Development Authority of India", "india", "https://bimabharosa.irdai.gov.in/Home/FAQ"),
  uidaiAddress: source("Unique Identification Authority of India", "india", "https://uidai.gov.in/en/contact-support/have-any-question/922-faqs/aadhaar-online-services/online-address-update-process.html"),
  voter: source("Election Commission of India", "india", "https://voters.eci.gov.in/formspdf/Form_8_English.pdf"),
  passport: source("Ministry of External Affairs", "india", "https://www.passportindia.gov.in/psp/FaqApplicationForm"),
  meeseva: source("Government of Telangana", "telangana", "https://ts.meeseva.telangana.gov.in/TSDeptPortal/UserInterface/Services.html"),
  rcAddress: source("Telangana Transport Department", "telangana", "https://www.transport.telangana.gov.in/html/registration-addresschange.html"),
  ghmcMutation: source("Greater Hyderabad Municipal Corporation", "hyderabad", "https://www.ghmc.gov.in/Property_Tax/Procedure_Online_Mutation.pdf"),
  electricity: source("TGSPDCL", "telangana", "https://www.tgsouthernpower.org/downloads"),
  indiaPost: source("Department of Posts", "india", "https://www.indiapost.gov.in/VAS/Pages/News/IP_19122024_Regulations.pdf"),
  mca: source("Ministry of Corporate Affairs", "india", "https://www.mca.gov.in/Ministry/pdf/SpicePlusFAQS_12032021.pdf"),
  gst: source("Central Board of Indirect Taxes and Customs", "india", "https://cbic-gst.gov.in/faq.html"),
  udyam: source("Ministry of Micro, Small and Medium Enterprises", "india", "https://udyamregistration.gov.in/"),
  tgipass: source("Government of Telangana", "telangana", "https://ipass.telangana.gov.in/tshome.aspx"),
  fssai: source("Food Safety and Standards Authority of India", "india", "https://fssai.gov.in/business?csrt=10573496876951079075"),
  dgft: source("Directorate General of Foreign Trade", "india", "https://content.dgft.gov.in/Website/DGFT%20-%20Profile%20Management%20%28IEC%29%20FAQs%20v1.0.pdf"),
  epfoEmployer: source("Employees' Provident Fund Organisation", "india", "https://www.epfindia.gov.in/site_en/For_Employers.php/FAQ.php"),
  startup: source("Department for Promotion of Industry and Internal Trade", "india", "https://www.startupindia.gov.in/content/sih/en/startupgov/startup_recognition_page.html"),
  epfo: source("Employees' Provident Fund Organisation", "india", "https://www.epfindia.gov.in/site_en/WhichClaimForm.php?id=sm2"),
  pfrda: source("Pension Fund Regulatory and Development Authority", "india", "https://www.pfrda.org.in/en/exit-nps"),
  pensionPortal: source("Department of Pension and Pensioners' Welfare", "india", "https://pensionersportal.gov.in/"),
  jeevanPramaan: source("Ministry of Electronics and Information Technology", "india", "https://jeevanpramaan.gov.in/v2.0/"),
  cpengrams: source("Department of Pension and Pensioners' Welfare", "india", "https://pgportal.gov.in/pension/"),
  socialPension: source("Government of Telangana", "telangana", "https://cheyutha.telangana.gov.in/SSPTG/UserInterface/Portal/GeneralSearch.aspx"),
  seniorSavings: source("National Savings Institute", "india", "https://www.nsiindia.gov.in/writereaddata/SchemeRules/SeniorCitizensSavingsSchemeRule.pdf"),
} as const;

export const newBabyTemplate: JourneyTemplate = {
  id: "new-baby.india.v1",
  version: 3,
  lifeEvent: "having_a_baby",
  title: "Having a Baby",
  branches: [
    { key: "birth_records", title: "Birth records", description: "Register the birth and receive the certificate.", requirement: "required" },
    { key: "child_health", title: "Child health", description: "Set up the health record and vaccination plan.", requirement: "required" },
    { key: "home_birth", title: "Home-birth reporting", description: "Use the informant route when the birth was outside an institution.", requirement: "conditional", gate: { all: [{ factKey: "birth.route", operator: "equals", value: "home" }] } },
    { key: "newborn_followup", title: "Newborn follow-up", description: "Add home visits and screening when clinical or programme follow-up applies.", requirement: "conditional", gate: { any: [{ factKey: "child.followupNeeded", operator: "equals", value: "yes" }, { factKey: "birth.route", operator: "equals", value: "home" }] } },
    { key: "child_identity", title: "Child identity", description: "Prepare identity-document next steps when you need them.", requirement: "optional" },
    { key: "family_support", title: "Family support", description: "Check benefits that may apply to your family.", requirement: "optional" },
  ],
  nodes: [
    { key: "birth_registration", title: "Birth registration", description: "Register your baby's birth with the local authority.", icon: "baby", timing: "Complete as soon as possible", branchKey: "birth_records", source: officialSources.ghmcBirth },
    { key: "hospital_birth_report", title: "Hospital birth report", description: "See how the institution reports the birth to the registrar.", icon: "building-2", timing: "Usually reported by the institution", branchKey: "birth_records", gate: { all: [{ factKey: "birth.route", operator: "equals", value: "hospital" }] }, action: "official_resource", countsTowardCompletion: false, source: officialSources.ghmcBirth },
    { key: "birth_entry_review", title: "Review the civil entry", description: "Check names, dates and parent details before relying on the certificate.", icon: "clipboard-check", timing: "After registration", branchKey: "birth_records", dependsOn: ["birth_registration"], action: "official_resource", countsTowardCompletion: false, source: officialSources.birthAct },
    { key: "birth_certificate", title: "Birth certificate", description: "Receive the child's synthetic birth record.", icon: "file-badge-2", timing: "Ready after registration", branchKey: "birth_records", dependsOn: ["birth_registration"], source: officialSources.ghmcBirth },
    { key: "home_birth_report", title: "Parent or relative report", description: "Prepare the informant and evidence route for a home birth.", icon: "house-plus", timing: "As soon as possible", branchKey: "home_birth", action: "official_resource", countsTowardCompletion: false, source: officialSources.ghmcBirth },
    { key: "child_health_record", title: "Mother and child record", description: "Create your child's longitudinal health record.", icon: "notebook-tabs", timing: "Recommended in the first weeks", branchKey: "child_health", dependsOn: ["birth_registration"], source: officialSources.childHealth },
    { key: "birth_dose_vaccines", title: "Birth-dose vaccines", description: "Keep the birth doses and administration record visible.", icon: "shield-plus", timing: "At birth", branchKey: "child_health", dependsOn: ["child_health_record"], kind: "milestone", action: "official_resource", countsTowardCompletion: false, source: officialSources.immunization },
    { key: "vaccination_timeline", title: "Vaccination timeline", description: "Plan and track essential vaccinations.", icon: "syringe", timing: "Next milestone at 6 weeks", branchKey: "child_health", dependsOn: ["child_health_record"], source: officialSources.immunization },
    { key: "uwin_record", title: "U-WIN vaccination record", description: "Keep appointments, administered doses and certificates together.", icon: "qr-code", timing: "After each public-program dose", branchKey: "child_health", dependsOn: ["vaccination_timeline"], action: "official_resource", countsTowardCompletion: false, source: officialSources.uwin },
    { key: "later_vaccine_milestones", title: "Later vaccine milestones", description: "Create dated duties for later childhood doses.", icon: "calendar-sync", timing: "From 9 months onward", branchKey: "child_health", dependsOn: ["vaccination_timeline"], kind: "recurring", action: "official_resource", countsTowardCompletion: false, source: officialSources.immunization },
    { key: "hbnc_visits", title: "Home-based newborn visits", description: "Track applicable ASHA follow-up visits through day 42.", icon: "house-heart", timing: "Through the first 42 days", branchKey: "newborn_followup", kind: "milestone", action: "official_resource", countsTowardCompletion: false, source: officialSources.childHealth },
    { key: "rbsk_screening", title: "Newborn screening", description: "Record screening and any referral for early intervention.", icon: "scan-heart", timing: "During newborn follow-up", branchKey: "newborn_followup", action: "official_resource", countsTowardCompletion: false, source: officialSources.childHealth },
    { key: "child_identity", title: "Child Aadhaar", description: "Prepare the under-five enrolment steps and guardian consent.", icon: "contact-round", timing: "Prepare after the birth certificate", branchKey: "child_identity", dependsOn: ["birth_certificate"], source: officialSources.uidaiChild },
    { key: "biometric_update_5", title: "Biometric update at 5", description: "Create a future duty for the first mandatory biometric update.", icon: "fingerprint", timing: "When the child turns 5", branchKey: "child_identity", dependsOn: ["child_identity"], kind: "recurring", action: "official_resource", countsTowardCompletion: false, source: officialSources.uidaiChild },
    { key: "eligible_benefits", title: "Eligible benefits", description: "Discover family-support routes without promising eligibility.", icon: "badge-indian-rupee", timing: "Review within the first 90 days", branchKey: "family_support", dependsOn: ["birth_registration"], source: officialSources.pmmvy },
    { key: "benefit_authority_decision", title: "Authority eligibility decision", description: "Track the official decision separately from UMANG's screening.", icon: "landmark", timing: "After an official application", branchKey: "family_support", dependsOn: ["eligible_benefits"], kind: "external_decision", action: "none", countsTowardCompletion: false, source: officialSources.pmmvy },
    { key: "sukanya_account", title: "Sukanya Samriddhi", description: "Explore the guardian-led savings account route for an eligible girl child.", icon: "piggy-bank", timing: "Before age 10", branchKey: "family_support", dependsOn: ["birth_certificate"], action: "official_resource", countsTowardCompletion: false, source: officialSources.sukanya },
  ],
  edges: [
    { from: "birth_registration", to: "child_health_record", type: "parallel", label: "Health work can continue while records are issued" },
    { from: "birth_registration", to: "home_birth_report", type: "alternative", label: "Home-birth reporting route" },
    { from: "rbsk_screening", to: "child_health_record", type: "activates", label: "A finding creates a referral path" },
    { from: "biometric_update_5", to: "child_identity", type: "recurs", label: "Future identity duty" },
  ],
};

export const vehiclePurchaseTemplate: JourneyTemplate = {
  id: "vehicle-purchase.india.v1",
  version: 3,
  lifeEvent: "buying_a_vehicle",
  title: "Buying a Vehicle",
  branches: [
    { key: "vehicle_record", title: "Vehicle record", description: "Confirm the vehicle that this journey follows.", requirement: "required" },
    { key: "ownership", title: "Ownership", description: "Prepare the ownership transfer.", requirement: "required" },
    { key: "protection", title: "Insurance", description: "Confirm the cover needed before driving.", requirement: "required" },
    { key: "road_readiness", title: "Road readiness", description: "Keep recurring compliance dates together.", requirement: "required" },
    { key: "tolling", title: "Toll access", description: "Add FASTag preparation if you expect highway travel.", requirement: "optional" },
    { key: "new_vehicle", title: "New-vehicle registration", description: "Dealer forms and first registration for a new vehicle.", requirement: "conditional", gate: { all: [{ factKey: "vehicle.acquisitionRoute", operator: "equals", value: "new" }] } },
    { key: "used_vehicle", title: "Used-vehicle transfer", description: "Seller verification and Forms 29/30 for a normal sale.", requirement: "conditional", gate: { all: [{ factKey: "vehicle.acquisitionRoute", operator: "equals", value: "sale" }] } },
    { key: "special_transfer", title: "Special ownership route", description: "Inheritance or auction evidence when the purchase is not a normal sale.", requirement: "conditional", gate: { any: [{ factKey: "vehicle.acquisitionRoute", operator: "equals", value: "inheritance" }, { factKey: "vehicle.acquisitionRoute", operator: "equals", value: "auction" }] } },
    { key: "interstate", title: "Interstate requirements", description: "NOC, tax clearance and reassignment when state borders are involved.", requirement: "conditional", gate: { all: [{ factKey: "vehicle.transferScope", operator: "equals", value: "interstate" }] } },
    { key: "finance", title: "Finance and hypothecation", description: "Financier consent, entry or termination when finance applies.", requirement: "conditional", gate: { any: [{ factKey: "vehicle.hypothecation", operator: "equals", value: "yes" }, { factKey: "vehicle.hypothecation", operator: "equals", value: "loan_cleared" }] } },
    { key: "monitoring", title: "Vehicle monitoring", description: "Optional official challan and status checks.", requirement: "optional" },
  ],
  nodes: [
    { key: "vehicle_details", title: "Confirm vehicle and parties", description: "Match the vehicle, buyer, seller and purchase route before preparing applications.", icon: "car-front", timing: "Start with the registration number", branchKey: "vehicle_record", source: officialSources.telanganaTransport },
    { key: "ownership_transfer", title: "Register ownership", description: "Prepare the applicable VAHAN registration or transfer case.", icon: "file-user", timing: "Use the deadline for the selected route", branchKey: "ownership", dependsOn: ["vehicle_details"], source: officialSources.parivahan },
    { key: "insurance_cover", title: "Insurance cover", description: "Check the policy and record the transfer or renewal action needed.", icon: "shield-check", timing: "Before driving the vehicle", branchKey: "protection", dependsOn: ["vehicle_details"], source: officialSources.irdaiMotor },
    { key: "policy_owner_match", title: "Match policy and RC owner", description: "Verify that the insurance and registration identify the same owner.", icon: "scan-line", timing: "After ownership is recorded", branchKey: "protection", dependsOn: ["ownership_transfer", "insurance_cover"], action: "official_resource", countsTowardCompletion: false, source: officialSources.irdaiMotor },
    { key: "compliance_calendar", title: "Compliance calendar", description: "Track insurance, PUC, tax and registration milestones in one place.", icon: "calendar-check-2", timing: "Keep these dates current", branchKey: "road_readiness", dependsOn: ["ownership_transfer", "insurance_cover"], source: officialSources.parivahan },
    { key: "puc_milestone", title: "PUC due date", description: "Create a dated pollution-certificate obligation from the verified record.", icon: "cloud-check", timing: "At the certificate due date", branchKey: "road_readiness", dependsOn: ["compliance_calendar"], kind: "recurring", action: "official_resource", countsTowardCompletion: false, source: officialSources.parivahan },
    { key: "tax_fitness_milestone", title: "Tax, fitness and RC duties", description: "Show only the recurring duties that apply to this vehicle class.", icon: "badge-check", timing: "According to vehicle class", branchKey: "road_readiness", dependsOn: ["compliance_calendar"], kind: "recurring", action: "official_resource", countsTowardCompletion: false, source: officialSources.parivahan },
    { key: "fastag_setup", title: "FASTag setup", description: "Validate the vehicle and prepare One Vehicle One FASTag activation.", icon: "radio-tower", timing: "Before the first highway trip", branchKey: "tolling", dependsOn: ["ownership_transfer"], source: officialSources.fastag },
    { key: "new_registration", title: "New registration forms", description: "Prepare Forms 20, 21 and 22 and the first-registration evidence.", icon: "file-plus-2", timing: "Within the official registration window", branchKey: "new_vehicle", action: "official_resource", countsTowardCompletion: false, source: officialSources.parivahan },
    { key: "normal_sale_forms", title: "Forms 29 and 30", description: "Prepare the transferor notice and transferee application for a normal sale.", icon: "files", timing: "Within 14 days for a same-state sale", branchKey: "used_vehicle", action: "official_resource", countsTowardCompletion: false, source: officialSources.telanganaTransport },
    { key: "special_route_evidence", title: "Succession or auction evidence", description: "Use Form 31 for inheritance or Form 32 for an official auction.", icon: "gavel", timing: "Within the route-specific period", branchKey: "special_transfer", action: "official_resource", countsTowardCompletion: false, source: officialSources.parivahan },
    { key: "interstate_noc", title: "Interstate NOC and clearance", description: "Prepare Form 28, tax status and destination-state evidence.", icon: "map-pinned", timing: "Before interstate transfer", branchKey: "interstate", action: "official_resource", countsTowardCompletion: false, source: officialSources.telanganaTransport },
    { key: "hypothecation_action", title: "Hypothecation action", description: "Prepare financier consent, Form 34 entry or Form 35 termination.", icon: "hand-coins", timing: "Before the RC ownership update", branchKey: "finance", action: "official_resource", countsTowardCompletion: false, source: officialSources.parivahan },
    { key: "echallan_monitoring", title: "eChallan monitoring", description: "Check official challan status without treating it as a transfer approval.", icon: "receipt-text", timing: "Before purchase and when notified", branchKey: "monitoring", action: "official_resource", countsTowardCompletion: false, source: officialSources.echallan },
  ],
  edges: [
    { from: "vehicle_details", to: "new_registration", type: "alternative", label: "New vehicle route" },
    { from: "vehicle_details", to: "normal_sale_forms", type: "alternative", label: "Normal sale route" },
    { from: "vehicle_details", to: "special_route_evidence", type: "alternative", label: "Inheritance or auction route" },
    { from: "interstate_noc", to: "ownership_transfer", type: "activates", label: "Interstate evidence feeds ownership" },
    { from: "compliance_calendar", to: "puc_milestone", type: "recurs" },
  ],
};

export const healthInsuranceTemplate: JourneyTemplate = {
  id: "health-insurance.india.v1",
  version: 3,
  lifeEvent: "managing_health_cover",
  title: "Health & Insurance",
  branches: [
    { key: "person_profile", title: "Person", description: "Confirm whose cover and care this journey follows.", requirement: "required" },
    { key: "cover_readiness", title: "Cover readiness", description: "Understand current cover and prepare for cashless care.", requirement: "required" },
    { key: "public_cover", title: "Public schemes", description: "Check a possible government cover pathway.", requirement: "optional" },
    { key: "digital_records", title: "Digital records", description: "Prepare ABHA and consent-aware record linking.", requirement: "optional" },
    { key: "senior_cover", title: "Cover for people aged 70+", description: "Use the separate senior PM-JAY verification route when age applies.", requirement: "conditional", gate: { all: [{ factKey: "health.senior70Plus", operator: "equals", value: "yes" }] } },
    { key: "employment_cover", title: "Employment-linked cover", description: "Verify ESIC or another employer scheme for this person.", requirement: "conditional", gate: { all: [{ factKey: "health.currentCover", operator: "equals", value: "employer" }] } },
    { key: "care_case", title: "Active care or claim", description: "Pre-authorisation, reimbursement and grievance work when care is happening now.", requirement: "conditional", gate: { all: [{ factKey: "health.activeClaim", operator: "equals", value: "yes" }] } },
  ],
  nodes: [
    { key: "health_profile", title: "Confirm the person", description: "Create one person-scoped case and record who is helping them.", icon: "user-round-check", timing: "Start with the person", branchKey: "person_profile", source: officialSources.abdm },
    { key: "actor_authority", title: "Authority and consent", description: "Record why the helper may act and what the person has consented to.", icon: "user-lock", timing: "Before accessing personal records", branchKey: "person_profile", dependsOn: ["health_profile"], action: "official_resource", countsTowardCompletion: false, source: officialSources.abdm },
    { key: "coverage_review", title: "Understand health cover", description: "Read the policy, limits, waiting periods and cashless terms for this person.", icon: "shield-ellipsis", timing: "Review before care is needed", branchKey: "cover_readiness", dependsOn: ["health_profile"], source: officialSources.irdaiHealth },
    { key: "cashless_readiness", title: "Prepare for cashless care", description: "Keep the right documents and authorization steps ready.", icon: "hospital", timing: "Keep this pack easy to reach", branchKey: "cover_readiness", dependsOn: ["coverage_review"], source: officialSources.irdaiHealth },
    { key: "policy_renewal", title: "Policy renewal and portability", description: "Create a dated review before renewal and the portability window.", icon: "calendar-heart", timing: "Before the policy renewal date", branchKey: "cover_readiness", dependsOn: ["coverage_review"], kind: "recurring", action: "official_resource", countsTowardCompletion: false, source: officialSources.irdaiHealth },
    { key: "public_scheme_check", title: "Check public schemes", description: "Screen for a possible government health-cover pathway.", icon: "search-check", timing: "Official verification is still required", branchKey: "public_cover", dependsOn: ["health_profile"], source: officialSources.pmjay },
    { key: "pmjay_verification", title: "PM-JAY beneficiary verification", description: "Keep official beneficiary verification separate from the initial indication.", icon: "badge-help", timing: "After a potential match", branchKey: "public_cover", dependsOn: ["public_scheme_check"], kind: "external_decision", action: "official_resource", countsTowardCompletion: false, source: officialSources.pmjay },
    { key: "aarogyasri_verification", title: "Aarogyasri verification", description: "Check the Telangana household route with the responsible Trust.", icon: "heart-handshake", timing: "When the Telangana route may apply", branchKey: "public_cover", dependsOn: ["public_scheme_check"], kind: "external_decision", action: "official_resource", countsTowardCompletion: false, source: officialSources.aarogyasri },
    { key: "abha_records", title: "ABHA & health records", description: "Prepare a digital health identity and consent-aware record plan.", icon: "file-heart", timing: "Only with this person’s consent", branchKey: "digital_records", dependsOn: ["health_profile"], source: officialSources.abdm },
    { key: "record_linking", title: "Discover and link records", description: "Link only records that belong to this person, then manage sharing consent.", icon: "link-2", timing: "After ABHA setup", branchKey: "digital_records", dependsOn: ["abha_records"], action: "official_resource", countsTowardCompletion: false, source: officialSources.abdm },
    { key: "senior_pmjay_card", title: "Ayushman card for 70+", description: "Prepare individual Aadhaar eKYC and card verification for the senior route.", icon: "badge-cent", timing: "When the person is 70 or older", branchKey: "senior_cover", action: "official_resource", countsTowardCompletion: false, source: officialSources.seniorPmjay },
    { key: "employment_scheme", title: "ESIC or employer scheme", description: "Verify the insured-person and family-benefit route for covered employment.", icon: "briefcase-medical", timing: "While employment cover applies", branchKey: "employment_cover", action: "official_resource", countsTowardCompletion: false, source: officialSources.esic },
    { key: "care_authorization", title: "Cashless pre-authorisation", description: "Track hospital submission, insurer review and final authorization separately.", icon: "clipboard-plus", timing: "At a network-hospital care event", branchKey: "care_case", dependsOn: ["cashless_readiness"], action: "official_resource", countsTowardCompletion: false, source: officialSources.irdaiHealth },
    { key: "reimbursement_claim", title: "Reimbursement claim", description: "Organise bills, prescriptions and the insurer's external decision.", icon: "receipt-indian-rupee", timing: "After non-cashless care", branchKey: "care_case", dependsOn: ["cashless_readiness"], action: "official_resource", countsTowardCompletion: false, source: officialSources.irdaiHealth },
    { key: "insurance_grievance", title: "Insurance grievance", description: "Escalate from the insurer GRO to Bima Bharosa when needed.", icon: "message-square-warning", timing: "After an unresolved insurer complaint", branchKey: "care_case", kind: "external_decision", action: "official_resource", countsTowardCompletion: false, source: officialSources.bima },
  ],
  edges: [
    { from: "health_profile", to: "public_scheme_check", type: "parallel", label: "Public and private cover can be reviewed together" },
    { from: "health_profile", to: "abha_records", type: "parallel", label: "Digital records remain consent based" },
    { from: "pmjay_verification", to: "cashless_readiness", type: "alternative", label: "Verified public cover route" },
    { from: "coverage_review", to: "cashless_readiness", type: "alternative", label: "Private or employer cover route" },
    { from: "insurance_grievance", to: "reimbursement_claim", type: "activates", label: "Only after a disputed decision" },
  ],
};

export const movingHomeTemplate: JourneyTemplate = {
  id: "moving-home.india.v1",
  version: 3,
  lifeEvent: "moving_home",
  title: "Moving Home",
  branches: [
    { key: "move_core", title: "Move essentials", description: "Confirm the move, evidence, and final checklist.", requirement: "required" },
    { key: "identity_updates", title: "Identity updates", description: "Add this branch to prepare both Aadhaar and voter-record changes.", requirement: "optional" },
    { key: "ration_card", title: "Ration-card move", description: "Correct, transfer or surrender the household card according to move geography.", requirement: "conditional", gate: { all: [{ factKey: "move.hasRationCard", operator: "equals", value: "yes" }] } },
    { key: "vehicle_address", title: "Vehicle address", description: "Update each owned vehicle and add interstate reassignment when required.", requirement: "conditional", gate: { all: [{ factKey: "move.hasVehicle", operator: "equals", value: "yes" }] } },
    { key: "property_and_utility", title: "Property and utilities", description: "Mutation or utility actions for the new premises.", requirement: "conditional", gate: { any: [{ factKey: "move.occupancy", operator: "equals", value: "owned" }, { factKey: "move.utilityAppointment", operator: "equals", value: "yes" }] } },
    { key: "postal", title: "Mail redirection", description: "Temporarily redirect India Post deliveries while records are updated.", requirement: "optional" },
  ],
  nodes: [
    { key: "move_profile", title: "Confirm your household move", description: "Check old and new addresses, move date and everyone who is moving.", icon: "house-heart", timing: "Start with the new address", branchKey: "move_core", source: officialSources.meeseva },
    { key: "residence_evidence", title: "Build the address-evidence pack", description: "Read evidence once, then keep acceptance specific to each authority.", icon: "folder-check", timing: "Before preparing requests", branchKey: "move_core", dependsOn: ["move_profile"], source: officialSources.uidaiAddress },
    { key: "move_completion_pack", title: "Close old-address risks", description: "Verify acknowledgements and keep every authority's status separate.", icon: "list-checks", timing: "Complete after moving", branchKey: "move_core", dependsOn: ["residence_evidence"], source: officialSources.meeseva },
    { key: "aadhaar_address", title: "Prepare Aadhaar address update", description: "Prepare document-based or Head-of-Family update steps for each resident.", icon: "id-card-lanyard", timing: "Each resident updates separately", branchKey: "identity_updates", dependsOn: ["residence_evidence"], source: officialSources.uidaiAddress },
    { key: "voter_address", title: "Prepare voter address update", description: "Prepare Form 8 details for each enrolled elector.", icon: "vote", timing: "After ordinarily residing there", branchKey: "identity_updates", dependsOn: ["residence_evidence"], gate: { all: [{ factKey: "move.hasEpic", operator: "equals", value: "yes" }] }, source: officialSources.voter },
    { key: "passport_reissue", title: "Passport address reissue", description: "Explore passport reissue when a resident wants the new address recorded.", icon: "book-user", timing: "When the passport address should change", branchKey: "identity_updates", dependsOn: ["residence_evidence"], action: "official_resource", countsTowardCompletion: false, source: officialSources.passport },
    { key: "ration_card_action", title: "Ration-card correction or transfer", description: "Choose the within-office, other-office or leaving-state route.", icon: "notebook-text", timing: "After establishing the new household address", branchKey: "ration_card", action: "official_resource", countsTowardCompletion: false, source: officialSources.meeseva },
    { key: "ration_authority_decision", title: "Food-security authority decision", description: "Track acknowledgement, clarification or transfer decision externally.", icon: "stamp", timing: "After the MeeSeva request", branchKey: "ration_card", dependsOn: ["ration_card_action"], kind: "external_decision", action: "none", countsTowardCompletion: false, source: officialSources.meeseva },
    { key: "rc_address_change", title: "RC address change", description: "Prepare Form 33 and vehicle-specific insurance, PUC and finance evidence.", icon: "car", timing: "Within 14 days of the address change", branchKey: "vehicle_address", action: "official_resource", countsTowardCompletion: false, source: officialSources.rcAddress },
    { key: "vehicle_reassignment", title: "Interstate vehicle reassignment", description: "Add NOC and new registration mark work when the 12-month condition applies.", icon: "route", timing: "When the vehicle remains in another state", branchKey: "vehicle_address", dependsOn: ["rc_address_change"], gate: { all: [{ factKey: "move.interstate", operator: "equals", value: "yes" }] }, action: "official_resource", countsTowardCompletion: false, source: officialSources.rcAddress },
    { key: "property_tax_mutation", title: "Property-tax mutation", description: "Prepare the GHMC owner mutation when property was purchased or inherited.", icon: "building", timing: "After property transfer", branchKey: "property_and_utility", gate: { all: [{ factKey: "move.occupancy", operator: "equals", value: "owned" }] }, action: "official_resource", countsTowardCompletion: false, source: officialSources.ghmcMutation },
    { key: "electricity_service", title: "Electricity connection or title", description: "Prepare the new-connection or title-transfer route with TGSPDCL.", icon: "plug-zap", timing: "Before or soon after occupancy", branchKey: "property_and_utility", action: "official_resource", countsTowardCompletion: false, source: officialSources.electricity },
    { key: "postal_redirection", title: "Temporary mail redirection", description: "Prepare written notice to the delivery post office for temporary redirection.", icon: "mail-plus", timing: "Valid for up to three months", branchKey: "postal", kind: "milestone", action: "official_resource", countsTowardCompletion: false, source: officialSources.indiaPost },
  ],
  edges: [
    { from: "move_profile", to: "aadhaar_address", type: "parallel", label: "One request per resident" },
    { from: "move_profile", to: "ration_card_action", type: "activates", label: "Household-level route" },
    { from: "move_profile", to: "rc_address_change", type: "activates", label: "One route per vehicle" },
    { from: "residence_evidence", to: "property_tax_mutation", type: "parallel", label: "Premises-level route" },
  ],
};

export const businessSetupTemplate: JourneyTemplate = {
  id: "business-setup.india.v1",
  version: 3,
  lifeEvent: "starting_a_business",
  title: "Starting a Business",
  branches: [
    { key: "launch_core", title: "Launch essentials", description: "Confirm the business, premises, and operating checklist.", requirement: "required" },
    { key: "formal_registrations", title: "Formal registrations", description: "Add this branch to prepare Udyam and then review the GST path.", requirement: "optional" },
    { key: "company_structure", title: "Company or LLP", description: "MCA incorporation and entity identifiers for incorporated structures.", requirement: "conditional", gate: { any: [{ factKey: "business.structure", operator: "equals", value: "company" }, { factKey: "business.structure", operator: "equals", value: "llp" }] } },
    { key: "local_licences", title: "Local establishment", description: "Municipal, Shops and Establishments and professional-tax routes.", requirement: "conditional", gate: { all: [{ factKey: "business.hasPremises", operator: "not_equals", value: "no" }] } },
    { key: "food_business", title: "Food business", description: "FSSAI tier selection and licence path for food activity.", requirement: "conditional", gate: { all: [{ factKey: "business.activityType", operator: "equals", value: "food" }] } },
    { key: "industrial_business", title: "Industrial approvals", description: "TG-iPASS establishment and operation approvals for industrial activity.", requirement: "conditional", gate: { all: [{ factKey: "business.activityType", operator: "equals", value: "industry" }] } },
    { key: "trade_and_workforce", title: "Trade and workforce", description: "IEC, EPFO and ESIC branches when activity or employee gates apply.", requirement: "conditional", gate: { any: [{ factKey: "business.importExport", operator: "equals", value: "yes" }, { factKey: "business.employeeCount", operator: "gte", value: 10 }] } },
    { key: "startup_recognition", title: "Startup recognition", description: "Optional DPIIT recognition after an eligible entity exists.", requirement: "optional" },
  ],
  nodes: [
    { key: "business_profile", title: "Confirm the business", description: "Choose the activity, structure, owners, location and expected start date.", icon: "briefcase-business", timing: "Start with the business basics", branchKey: "launch_core", source: officialSources.tgipass },
    { key: "business_premises", title: "Check premises evidence", description: "Read the document supporting the principal place of business.", icon: "store", timing: "Before tax or local registrations", branchKey: "launch_core", dependsOn: ["business_profile"], source: officialSources.gst },
    { key: "business_launch_pack", title: "Build the ready-to-trade pack", description: "Bring every activated legal, tax, local and sector output together.", icon: "rocket", timing: "Before the first invoice", branchKey: "launch_core", dependsOn: ["business_premises"], source: officialSources.tgipass },
    { key: "recurring_business_duties", title: "Recurring compliance duties", description: "Create dated obligations only for registrations the business actually holds.", icon: "calendar-range", timing: "After registrations begin", branchKey: "launch_core", dependsOn: ["business_launch_pack"], kind: "recurring", action: "official_resource", countsTowardCompletion: false, source: officialSources.gst },
    { key: "udyam_readiness", title: "Prepare Udyam registration", description: "Check the free, paperless self-declaration route for the enterprise.", icon: "badge-check", timing: "When the enterprise is ready to register", branchKey: "formal_registrations", dependsOn: ["business_premises"], source: officialSources.udyam },
    { key: "gst_readiness", title: "Check GST registration path", description: "Review turnover, supplies and statutory triggers without deciding tax liability.", icon: "landmark", timing: "Verify before taxable supplies begin", branchKey: "formal_registrations", dependsOn: ["business_premises"], source: officialSources.gst },
    { key: "mca_incorporation", title: "MCA incorporation", description: "Prepare SPICe+ and linked forms for a company or LLP.", icon: "building-2", timing: "Before trading as the incorporated entity", branchKey: "company_structure", action: "official_resource", countsTowardCompletion: false, source: officialSources.mca },
    { key: "entity_identifiers", title: "PAN, TAN and entity identifiers", description: "Track identifiers issued through the chosen legal-structure route.", icon: "scan-text", timing: "After entity registration", branchKey: "company_structure", dependsOn: ["mca_incorporation"], kind: "external_decision", action: "none", countsTowardCompletion: false, source: officialSources.mca },
    { key: "local_trade_licence", title: "Local trade licence", description: "Check the municipal and establishment approvals for this activity and premises.", icon: "shopping-bag", timing: "Before local operations", branchKey: "local_licences", action: "official_resource", countsTowardCompletion: false, source: officialSources.tgipass },
    { key: "professional_tax", title: "Professional tax and labour", description: "Prepare Telangana registration when the professional, employer or entity gate applies.", icon: "users-round", timing: "When the business or payroll becomes liable", branchKey: "local_licences", action: "official_resource", countsTowardCompletion: false, source: officialSources.tgipass },
    { key: "fssai_licence", title: "FSSAI registration or licence", description: "Select the current registration, state-licence or central-licence tier.", icon: "utensils", timing: "Before operating a food business", branchKey: "food_business", action: "official_resource", countsTowardCompletion: false, source: officialSources.fssai },
    { key: "tgipass_approvals", title: "TG-iPASS approvals", description: "Generate applicable establishment, building, pollution, fire and utility approvals.", icon: "factory", timing: "Before establishment and operation", branchKey: "industrial_business", action: "official_resource", countsTowardCompletion: false, source: officialSources.tgipass },
    { key: "dgft_iec", title: "Importer Exporter Code", description: "Prepare DGFT identity, bank and KYC inputs for an IEC.", icon: "ship-wheel", timing: "Before import or export activity", branchKey: "trade_and_workforce", gate: { all: [{ factKey: "business.importExport", operator: "equals", value: "yes" }] }, action: "official_resource", countsTowardCompletion: false, source: officialSources.dgft },
    { key: "employment_compliance", title: "EPFO and ESIC workforce gate", description: "Apply current establishment, headcount and wage rules without assuming liability.", icon: "hard-hat", timing: "When workforce thresholds apply", branchKey: "trade_and_workforce", action: "official_resource", countsTowardCompletion: false, source: officialSources.epfoEmployer },
    { key: "dpiit_recognition", title: "DPIIT startup recognition", description: "Prepare the recognition case without promising approval or downstream benefits.", icon: "lightbulb", timing: "After an eligible entity exists", branchKey: "startup_recognition", action: "official_resource", countsTowardCompletion: false, source: officialSources.startup },
  ],
  edges: [
    { from: "business_profile", to: "mca_incorporation", type: "alternative", label: "Company or LLP route" },
    { from: "business_profile", to: "udyam_readiness", type: "parallel", label: "MSME recognition is optional" },
    { from: "business_profile", to: "fssai_licence", type: "activates", label: "Food activity gate" },
    { from: "business_profile", to: "tgipass_approvals", type: "activates", label: "Industrial activity gate" },
    { from: "business_launch_pack", to: "recurring_business_duties", type: "recurs" },
  ],
};

export const retirementTemplate: JourneyTemplate = {
  id: "retirement.india.v1",
  version: 3,
  lifeEvent: "retirement",
  title: "Retirement",
  branches: [
    { key: "retirement_core", title: "Retirement essentials", description: "Review records, pension paths, and the retirement pack.", requirement: "required" },
    { key: "ongoing_pension", title: "Ongoing pension duties", description: "Add life-certificate preparation when a pension authority requires it.", requirement: "optional" },
    { key: "epfo_route", title: "EPFO and EPS", description: "Use age and eligible service to select the correct PF and pension claims.", requirement: "conditional", gate: { all: [{ factKey: "retirement.accountType", operator: "one_of", value: ["epfo", "multiple"] }] } },
    { key: "nps_route", title: "National Pension System", description: "Apply current sector, corpus and exit regulations to the PRAN case.", requirement: "conditional", gate: { all: [{ factKey: "retirement.accountType", operator: "one_of", value: ["nps", "multiple"] }] } },
    { key: "government_pension", title: "Government pension", description: "Service-book, PPO and bank setup for a government-pension route.", requirement: "conditional", gate: { all: [{ factKey: "retirement.employmentSector", operator: "one_of", value: ["central_government", "state_government"] }] } },
    { key: "state_support", title: "State pension support", description: "Screen a current Telangana social-pension route without promising eligibility.", requirement: "conditional", gate: { all: [{ factKey: "retirement.lowIncomeSupport", operator: "equals", value: "yes" }] } },
    { key: "retiree_health", title: "Retiree health cover", description: "Check senior or former-employer health-cover routes person by person.", requirement: "optional" },
    { key: "retirement_savings", title: "Senior savings", description: "Explore the rule-bound Senior Citizens' Savings Scheme.", requirement: "optional" },
  ],
  nodes: [
    { key: "retirement_profile", title: "Confirm your retirement", description: "Identify the retiree, date and every pension or corpus route.", icon: "armchair", timing: "Start 6 months before retirement", branchKey: "retirement_core", source: officialSources.pensionPortal },
    { key: "retirement_record_review", title: "Reconcile retirement records", description: "Compare identity, bank, nominee, service and scheme records before claiming.", icon: "folder-search", timing: "Before making any claim", branchKey: "retirement_core", dependsOn: ["retirement_profile"], source: officialSources.epfo },
    { key: "pension_pathway", title: "Prepare pension pathways", description: "Separate every applicable scheme and employer action.", icon: "waypoints", timing: "Official eligibility must be verified", branchKey: "retirement_core", dependsOn: ["retirement_record_review"], source: officialSources.pensionPortal },
    { key: "payment_verification", title: "Verify pension and claim outputs", description: "Check each payment, PPO or settlement before closing the route.", icon: "badge-indian-rupee", timing: "After an authority settles a route", branchKey: "retirement_core", dependsOn: ["pension_pathway"], action: "official_resource", countsTowardCompletion: false, source: officialSources.pensionPortal },
    { key: "retirement_pack", title: "Build your retirement pack", description: "Keep claim records, contacts, dates and verification gaps together.", icon: "archive", timing: "Review yearly", branchKey: "retirement_core", dependsOn: ["pension_pathway"], source: officialSources.pensionPortal },
    { key: "life_certificate_readiness", title: "Plan life-certificate duties", description: "Prepare Jeevan Pramaan only when the pension authority requires it.", icon: "scan-face", timing: "After pension begins", branchKey: "ongoing_pension", dependsOn: ["pension_pathway"], source: officialSources.jeevanPramaan },
    { key: "life_certificate_acceptance", title: "Confirm authority acceptance", description: "Track whether the disbursing authority accepted the submitted certificate.", icon: "circle-check-big", timing: "After each required submission", branchKey: "ongoing_pension", dependsOn: ["life_certificate_readiness"], kind: "recurring", action: "official_resource", countsTowardCompletion: false, source: officialSources.jeevanPramaan },
    { key: "epfo_claim_choice", title: "EPF and EPS claim choice", description: "Use age and eligible service to select Form 19, 10C or 10D work.", icon: "file-spreadsheet", timing: "At or before retirement", branchKey: "epfo_route", action: "official_resource", countsTowardCompletion: false, source: officialSources.epfo },
    { key: "epfo_authority_decision", title: "EPFO settlement decision", description: "Track PF settlement, scheme certificate or pension sanction externally.", icon: "landmark", timing: "After the correct claim", branchKey: "epfo_route", dependsOn: ["epfo_claim_choice"], kind: "external_decision", action: "none", countsTowardCompletion: false, source: officialSources.epfo },
    { key: "nps_exit_choice", title: "Current NPS exit options", description: "Load the current sector, vesting, corpus and payout rules instead of hard-coding 60/40.", icon: "chart-no-axes-combined", timing: "At the applicable exit event", branchKey: "nps_route", action: "official_resource", countsTowardCompletion: false, source: officialSources.pfrda },
    { key: "nps_authority_decision", title: "CRA or authority settlement", description: "Track the external lump-sum, annuity or approved payout decision.", icon: "circle-dollar-sign", timing: "After the exit request", branchKey: "nps_route", dependsOn: ["nps_exit_choice"], kind: "external_decision", action: "none", countsTowardCompletion: false, source: officialSources.pfrda },
    { key: "ppo_and_bank_setup", title: "PPO and pension bank setup", description: "Prepare service-book, no-dues, pension papers and disbursement details.", icon: "book-key", timing: "Before the first pension", branchKey: "government_pension", action: "official_resource", countsTowardCompletion: false, source: officialSources.pensionPortal },
    { key: "social_pension_screen", title: "Telangana social-pension screen", description: "Check the current state route and keep the authority decision explicit.", icon: "hand-heart", timing: "When the current state conditions may apply", branchKey: "state_support", kind: "external_decision", action: "official_resource", countsTowardCompletion: false, source: officialSources.socialPension },
    { key: "senior_health_cover", title: "Senior health-cover check", description: "Verify PM-JAY 70+ or another retiree scheme for this person.", icon: "heart-pulse", timing: "Before employer cover ends", branchKey: "retiree_health", action: "official_resource", countsTowardCompletion: false, source: officialSources.seniorPmjay },
    { key: "senior_savings_account", title: "Senior Citizens' Savings Scheme", description: "Prepare age and retirement-benefit timing evidence for the savings route.", icon: "piggy-bank", timing: "Within the applicable rule window", branchKey: "retirement_savings", action: "official_resource", countsTowardCompletion: false, source: officialSources.seniorSavings },
    { key: "pension_grievance", title: "Pension grievance", description: "Prepare a scheme grievance or CPENGRAMS escalation with claim identifiers.", icon: "message-circle-warning", timing: "After an unresolved claim or payment problem", branchKey: "retirement_core", dependsOn: ["pension_pathway"], action: "official_resource", countsTowardCompletion: false, source: officialSources.cpengrams },
  ],
  edges: [
    { from: "pension_pathway", to: "epfo_claim_choice", type: "alternative", label: "EPFO/EPS route" },
    { from: "pension_pathway", to: "nps_exit_choice", type: "alternative", label: "NPS route" },
    { from: "pension_pathway", to: "ppo_and_bank_setup", type: "alternative", label: "Government pension route" },
    { from: "payment_verification", to: "life_certificate_readiness", type: "activates", label: "Only when the authority requires it" },
    { from: "life_certificate_acceptance", to: "life_certificate_readiness", type: "recurs", label: "Authority-defined recurrence" },
  ],
};

export const journeyTemplates = [newBabyTemplate, vehiclePurchaseTemplate, healthInsuranceTemplate, movingHomeTemplate, businessSetupTemplate, retirementTemplate] as const;

export function getJourneyTemplate(templateId: string) {
  return journeyTemplates.find((template) => template.id === templateId);
}

const runtimeStatuses = new Set<NodeStatus>(["in_progress", "waiting_external", "blocked"]);

type GateResult = true | false | "unknown";

function evaluatePredicate(predicate: JourneyFactPredicate, facts: Record<string, string>): GateResult {
  const fact = facts[predicate.factKey];
  if (fact === undefined || fact.trim() === "") return "unknown";
  if (["not_sure", "unknown", "unconfirmed"].includes(fact.trim().toLowerCase())) return "unknown";
  if (predicate.operator === "exists") return true;
  if (predicate.operator === "equals") return fact === String(predicate.value ?? "");
  if (predicate.operator === "not_equals") return fact !== String(predicate.value ?? "");
  if (predicate.operator === "one_of") return Array.isArray(predicate.value) && predicate.value.includes(fact);
  const numericFact = Number(fact);
  const numericValue = Number(predicate.value);
  if (!Number.isFinite(numericFact) || !Number.isFinite(numericValue)) return false;
  return predicate.operator === "gte" ? numericFact >= numericValue : numericFact < numericValue;
}

export function evaluateGate(gate: JourneyGateDefinition | undefined, facts: Record<string, string>): JourneyApplicability {
  if (!gate) return "applicable";
  const allResults = (gate.all ?? []).map((predicate) => evaluatePredicate(predicate, facts));
  const anyResults = (gate.any ?? []).map((predicate) => evaluatePredicate(predicate, facts));
  const allResult: GateResult = allResults.some((result) => result === false)
    ? false
    : allResults.some((result) => result === "unknown") ? "unknown" : true;
  const anyResult: GateResult = anyResults.length === 0
    ? true
    : anyResults.some((result) => result === true) ? true
      : anyResults.some((result) => result === "unknown") ? "unknown" : false;
  if (allResult === false || anyResult === false) return "not_applicable";
  if (allResult === "unknown" || anyResult === "unknown") return "pending";
  return "applicable";
}

function branchStatus(definition: JourneyBranchDefinition, active: boolean, applicability: JourneyApplicability, nodes: JourneyNode[]): JourneyBranchStatus {
  if (applicability === "pending") return "awaiting_context";
  if (applicability === "not_applicable") return "not_applicable";
  if (!active) return "inactive";
  const members = nodes.filter((node) => node.branchKey === definition.key && node.applicability === "applicable");
  const completionMembers = members.filter((node) => node.contributesToCompletion);
  if (completionMembers.length > 0 && completionMembers.every((node) => node.status === "completed" || node.status === "skipped")) return "completed";
  if (members.some((node) => node.status === "blocked")) return "blocked";
  if (members.some((node) => node.status === "in_progress" || node.status === "waiting_external" || node.status === "completed")) return "in_progress";
  if (members.some((node) => node.status === "available")) return "available";
  return "locked";
}

function evaluateJourney(
  template: JourneyTemplate,
  completed: Set<string>,
  activeBranchKeys: Set<string>,
  previousStatuses = new Map<string, NodeStatus>(),
  facts: Record<string, string> = {},
): Pick<JourneyProjection, "nodes" | "branches"> {
  const branchApplicability = new Map(template.branches.map((branch) => [branch.key, evaluateGate(branch.gate, facts)]));
  const active = new Set(template.branches.filter((branch) => {
    const applicability = branchApplicability.get(branch.key);
    if (applicability !== "applicable") return false;
    return branch.requirement === "required" || branch.requirement === "conditional" || activeBranchKeys.has(branch.key);
  }).map((branch) => branch.key));
  const nodes: JourneyNode[] = template.nodes.map((node) => {
    const previous = previousStatuses.get(node.key);
    const branchIsActive = active.has(node.branchKey);
    const branchApplies = branchApplicability.get(node.branchKey) ?? "not_applicable";
    const nodeApplicability = branchApplies === "applicable" ? evaluateGate(node.gate, facts) : branchApplies;
    const contributesToCompletion = node.countsTowardCompletion ?? true;
    const actionable = (node.action ?? "workflow") !== "none";
    const everyDependencyComplete = (node.dependsOn ?? []).every((key) => completed.has(key));
    const anyDependencyComplete = !(node.dependsOnAny?.length) || node.dependsOnAny.some((key) => completed.has(key));
    const status: NodeStatus = completed.has(node.key)
      ? "completed"
      : !branchIsActive || nodeApplicability !== "applicable"
        ? "locked"
      : previous && runtimeStatuses.has(previous)
          ? previous
          : !everyDependencyComplete || !anyDependencyComplete
            ? "locked"
            : "available";
    return { ...node, status, recommended: false, applicability: nodeApplicability, actionable, contributesToCompletion };
  });
  const firstAvailable = nodes.find((node) => node.status === "available" && node.actionable && node.contributesToCompletion);
  if (firstAvailable) {
    firstAvailable.recommended = true;
    if (completed.size === 0) firstAvailable.status = "in_progress";
  }
  const branches = template.branches.map((branch) => {
    const isActive = active.has(branch.key);
    const applicability = branchApplicability.get(branch.key) ?? "not_applicable";
    return { ...branch, active: isActive, applicability, status: branchStatus(branch, isActive, applicability, nodes) };
  });
  return { nodes, branches };
}

function edgesFor(template: JourneyTemplate) {
  const dependencyEdges: JourneyEdgeDefinition[] = template.nodes.flatMap((node) => [
    ...(node.dependsOn ?? []).map((from) => ({ from, to: node.key, type: "hard" as const })),
    ...(node.dependsOnAny ?? []).map((from) => ({ from, to: node.key, type: "alternative" as const })),
  ]);
  const seen = new Set<string>();
  return [...dependencyEdges, ...(template.edges ?? [])].filter((edge) => {
    const key = `${edge.from}:${edge.to}:${edge.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function compileJourney(template: JourneyTemplate, facts: Record<string, string> = {}): JourneyProjection {
  const evaluated = evaluateJourney(template, new Set(), new Set(), new Map(), facts);
  return { templateId: template.id, templateVersion: template.version, ...evaluated, edges: edgesFor(template) };
}

export function hydrateJourney(template: JourneyTemplate, storedNodes: Array<{ key: string; status: NodeStatus }>, activeBranchKeys: Iterable<string> = [], facts: Record<string, string> = {}): JourneyProjection {
  const completed = new Set(storedNodes.filter((node) => node.status === "completed").map((node) => node.key));
  const previousStatuses = new Map(storedNodes.map((node) => [node.key, node.status]));
  const inferredActiveBranches = template.branches
    .filter((branch) => branch.requirement === "optional")
    .filter((branch) => storedNodes.some((node) => template.nodes.find((definition) => definition.key === node.key)?.branchKey === branch.key && node.status !== "locked"))
    .map((branch) => branch.key);
  const evaluated = evaluateJourney(template, completed, new Set([...activeBranchKeys, ...inferredActiveBranches]), previousStatuses, facts);
  return { templateId: template.id, templateVersion: template.version, ...evaluated, edges: edgesFor(template) };
}

function templateForProjection(projection: JourneyProjection): JourneyTemplate {
  const registered = getJourneyTemplate(projection.templateId);
  if (!registered) throw new Error(`Unknown journey template: ${projection.templateId}`);
  return {
    id: projection.templateId,
    version: projection.templateVersion,
    lifeEvent: registered.lifeEvent,
    title: registered.title,
    branches: projection.branches.map((branch) => ({
      key: branch.key,
      title: branch.title,
      description: branch.description,
      requirement: branch.requirement,
      gate: branch.gate,
    })),
    nodes: projection.nodes.map((node) => ({
      key: node.key,
      title: node.title,
      description: node.description,
      icon: node.icon,
      timing: node.timing,
      branchKey: node.branchKey,
      dependsOn: node.dependsOn,
      dependsOnAny: node.dependsOnAny,
      gate: node.gate,
      kind: node.kind,
      action: node.action,
      countsTowardCompletion: node.countsTowardCompletion,
      source: node.source,
    })),
    edges: projection.edges,
  };
}

export function reevaluateJourney(projection: JourneyProjection, facts: Record<string, string>): JourneyProjection {
  const template = templateForProjection(projection);
  const activeBranchKeys = projection.branches.filter((branch) => branch.requirement === "optional" && branch.active).map((branch) => branch.key);
  return hydrateJourney(template, projection.nodes, activeBranchKeys, facts);
}

export function activateBranch(projection: JourneyProjection, branchKey: string, facts: Record<string, string> = {}): JourneyProjection {
  const template = templateForProjection(projection);
  if (!template.branches.some((branch) => branch.key === branchKey)) throw new Error(`Unknown journey branch: ${branchKey}`);
  const completed = new Set(projection.nodes.filter((node) => node.status === "completed").map((node) => node.key));
  const previousStatuses = new Map(projection.nodes.map((node) => [node.key, node.status]));
  const activeBranchKeys = new Set(projection.branches.filter((branch) => branch.active).map((branch) => branch.key));
  activeBranchKeys.add(branchKey);
  const evaluated = evaluateJourney(template, completed, activeBranchKeys, previousStatuses, facts);
  return { ...projection, ...evaluated };
}

export function completeNode(projection: JourneyProjection, nodeKey: string, facts: Record<string, string> = {}): JourneyProjection {
  const template = templateForProjection(projection);
  const completed = new Set(projection.nodes.filter((node) => node.status === "completed").map((node) => node.key));
  completed.add(nodeKey);
  const previousStatuses = new Map(projection.nodes.map((node) => [node.key, node.status]));
  const activeBranchKeys = new Set(projection.branches.filter((branch) => branch.active).map((branch) => branch.key));
  const evaluated = evaluateJourney(template, completed, activeBranchKeys, previousStatuses, facts);
  return { ...projection, ...evaluated };
}

export function isJourneyComplete(projection: JourneyProjection) {
  return journeyProgressNodes(projection).every((node) => node.status === "completed" || node.status === "skipped");
}

export function journeyProgressNodes(projection: JourneyProjection) {
  const included = new Set(projection.branches.filter((branch) => branch.active && branch.applicability === "applicable").map((branch) => branch.key));
  return projection.nodes.filter((node) => included.has(node.branchKey) && node.applicability === "applicable" && node.contributesToCompletion);
}

export function validateTemplate(template: JourneyTemplate): string[] {
  const nodeKeys = new Set(template.nodes.map((node) => node.key));
  const branchKeys = new Set(template.branches.map((branch) => branch.key));
  const errors: string[] = [];
  for (const node of template.nodes) {
    if (!branchKeys.has(node.branchKey)) errors.push(`${node.key}:missing_branch`);
    for (const dependency of node.dependsOn ?? []) if (!nodeKeys.has(dependency)) errors.push(`${node.key}:missing_dependency`);
    for (const dependency of node.dependsOnAny ?? []) if (!nodeKeys.has(dependency)) errors.push(`${node.key}:missing_alternative_dependency`);
  }
  for (const edge of template.edges ?? []) {
    if (!nodeKeys.has(edge.from)) errors.push(`${edge.from}:missing_edge_source`);
    if (!nodeKeys.has(edge.to)) errors.push(`${edge.to}:missing_edge_target`);
  }
  for (const key of nodeKeys) if (template.nodes.filter((node) => node.key === key).length > 1) errors.push(`${key}:duplicate_node`);
  for (const key of branchKeys) if (template.branches.filter((branch) => branch.key === key).length > 1) errors.push(`${key}:duplicate_branch`);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const nodeByKey = new Map(template.nodes.map((node) => [node.key, node]));
  function visit(key: string) {
    if (visited.has(key)) return;
    visiting.add(key);
    for (const dependency of [...(nodeByKey.get(key)?.dependsOn ?? []), ...(nodeByKey.get(key)?.dependsOnAny ?? [])]) {
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
