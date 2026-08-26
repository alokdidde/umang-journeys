"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  ExternalLink,
  Eye,
  FileDown,
  FileUp,
  FlaskConical,
  LoaderCircle,
  LockKeyhole,
  RotateCw,
  Server,
  ShieldCheck,
} from "lucide-react";
import { useJourney } from "@/components/journey-provider";
import {
  isSandboxServiceKey,
  serviceWorkflowDefinitions,
  type ArtifactItemStatus,
  type ProviderScenario,
  type SandboxServiceRun,
  type ServiceArtifact,
} from "@/domain/service-workflows";
import { evidenceLabels, missingEvidence, serviceEvidenceRequirements, type EvidenceType, type JourneyEvidence } from "@/domain/evidence";

const guidanceLinks: Record<string, { label: string; href: string }> = {
  child_health_record: { label: "Read ABDM citizen guidance", href: "https://abdm.gov.in/citizens" },
  vaccination_timeline: { label: "View the U-WIN citizen guide", href: "https://uwindashboard.mohfw.gov.in/assets/pdf/Self_Registration_Module_U-WIN_SOP_v2_Apr_2024-1.pdf" },
  child_identity: { label: "Read UIDAI child enrolment guidance", href: "https://www.uidai.gov.in/en/296-english-uk/faqs/enrolment-update/aadhaar-enrolment-process/12811-what-is-the-enrolment-procedure-for-children-below-the-age-of-5-years.html" },
  eligible_benefits: { label: "View Telangana programme information", href: "https://hyderabad.telangana.gov.in/scheme/arogya-lakshmi/" },
  ownership_transfer: { label: "Read Parivahan transfer guidance", href: "https://mparivahan.parivahan.gov.in/mstatic/english/rc-info-ownership.html" },
  fastag_setup: { label: "Read the current IHMCL FASTag guidance", href: "https://ihmcl.co.in/faq/" },
  compliance_calendar: { label: "Open Parivahan vehicle services", href: "https://parivahan.gov.in/parivahan/" },
  coverage_review: { label: "Read IRDAI health insurance guidance", href: "https://irdai.gov.in/health-dept" },
  public_scheme_check: { label: "Read official PM-JAY entitlement guidance", href: "https://nha.gov.in/img/resources/Adhikar-Patra.pdf" },
  abha_records: { label: "Read ABDM citizen guidance", href: "https://abdm.gov.in/citizens" },
  cashless_readiness: { label: "Read IRDAI cashless-service guidance", href: "https://irdai.gov.in/faqs-on-health-insurance-regulations" },
  residence_evidence: { label: "Read UIDAI supporting-document guidance", href: "https://www.uidai.gov.in/en/921-faqs/aadhaar-online.html" },
  aadhaar_address: { label: "Open official Aadhaar update guidance", href: "https://www.uidai.gov.in/en/my-aadhaar/update-aadhaar.html" },
  voter_address: { label: "Open the official Form 8 service", href: "https://voters.eci.gov.in/home/forms" },
  move_completion_pack: { label: "Read Parivahan address-change guidance", href: "https://mparivahan.parivahan.gov.in/mstatic/english/rc-info-address-change.html" },
  business_premises: { label: "Read the GST document checklist", href: "https://tutorial.gst.gov.in/cbt/registration/gstregistration/course/story_content/external_files/GST_Registration_Document_Checklist.pdf" },
  udyam_readiness: { label: "Open the official free Udyam service", href: "https://udyamregistration.gov.in/" },
  gst_readiness: { label: "Read official GST registration FAQs", href: "https://cbic-gst.gov.in/faq.html" },
  business_launch_pack: { label: "Find official business services", href: "https://services.india.gov.in/" },
  retirement_record_review: { label: "Open official EPFO member services", href: "https://www.epfindia.gov.in/site_en/For_Employees.php" },
  pension_pathway: { label: "Read the official EPFO claim guide", href: "https://www.epfindia.gov.in/site_en/WhichClaimForm.php" },
  life_certificate_readiness: { label: "Read official Jeevan Pramaan guidance", href: "https://jeevanpramaan.gov.in/v2.0/misc/faq" },
  retirement_pack: { label: "Find official pension services", href: "https://services.india.gov.in/service/listing?cat_id=36&ln=en" },
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function statusLabel(status: ArtifactItemStatus) {
  return ({
    verified: "Verified",
    ready: "Ready",
    due: "Action due",
    upcoming: "Upcoming",
    review: "Needs review",
    information: "Information",
  } as const)[status];
}

export default function SandboxServicePage() {
  const { id, key } = useParams<{ id: string; key: string }>();
  const { state, loadJourney, advanceService, addEvidence, reviewEvidence, updateJourneyFacts } = useJourney();
  const validKey = isSandboxServiceKey(key) ? key : null;
  const definition = validKey ? serviceWorkflowDefinitions[validKey] : null;
  const node = state.projection.nodes.find((candidate) => candidate.key === key);
  const run = validKey ? state.serviceRuns[validKey] : undefined;
  const [scenario, setScenario] = useState<ProviderScenario>("success");
  const artifactHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (id && state.journeyId !== id) void loadJourney(id);
  }, [id, loadJourney, state.journeyId]);

  useEffect(() => {
    if (!validKey || !run || run.status === "completed" || run.status === "failed" || state.pending || state.error) return;
    const timer = window.setTimeout(() => void loadJourney(id), 850);
    return () => window.clearTimeout(timer);
  }, [id, loadJourney, run, state.error, state.pending, validKey]);

  useEffect(() => {
    if (run?.status === "completed") artifactHeadingRef.current?.focus();
  }, [run?.status]);

  if (!definition || !validKey) return <main className="page workflow-state"><h1>Service not found</h1><p>This journey does not include that service.</p><Link className="primary-cta" href={`/journeys/${id}`}>Return to journey</Link></main>;
  if (state.journeyId !== id && !state.error) return <main className="page workflow-state"><LoaderCircle className="service-spinner" /><p>Loading service workspace…</p></main>;
  if (state.error && state.journeyId !== id) return <main className="page workflow-state"><h1>Unable to load this service.</h1><p>{state.error}</p><Link className="primary-cta" href={`/journeys/${id}`}>Return to journey</Link></main>;
  if (node?.status === "locked") return <main className="page workflow-state"><LockKeyhole /><h1>This service is still locked.</h1><p>Complete the previous journey step before using this service.</p><Link className="primary-cta" href={`/journeys/${id}`}>Return to journey</Link></main>;

  const completed = run?.status === "completed";
  const nextStage = definition.stages[run?.currentStage ?? 0];
  const guidance = guidanceLinks[validKey];

  async function startService() {
    if (!validKey) return false;
    const saved = await updateJourneyFacts(id, { [`simulation.scenario.${validKey}`]: scenario, [`simulation.consent.${validKey}`]: new Date(Date.now() + 30 * 60 * 1000).toISOString() });
    return saved ? advanceService(id, validKey) : false;
  }

  return (
    <main className="page service-page">
      <div className="service-shell">
        <nav className="service-navigation" aria-label="Service navigation">
          <Link href={`/journeys/${id}`} className="floating-back"><ArrowLeft />Back to journey</Link>
          <span><FlaskConical />Evaluation sandbox</span>
        </nav>

        <header className="service-workspace-header">
          <div>
            <p className="eyebrow"><Server />{definition.agencyShort}</p>
            <h1>{node?.title ?? validKey}</h1>
            <p>{definition.explanation}</p>
          </div>
          {run ? <div className={`service-state-card ${completed ? "completed" : "processing"}`} role="status" aria-live="polite">
            <span>{completed ? <BadgeCheck /> : run ? <LoaderCircle className="service-spinner" /> : <ShieldCheck />}</span>
            <div>
              <small>Current state</small>
              <strong>{completed ? "Approved" : run?.caseStatus === "action_required" ? "Your response is needed" : run?.caseStatus === "rejected" ? "Provider decision: rejected" : run?.status === "waiting_external" ? "Waiting for provider" : run ? (run.caseStatus ?? "processing").replaceAll("_", " ") : "Ready to connect"}</strong>
              <p>{completed ? `Finished ${formatTimestamp(run.completedAt ?? run.updatedAt)}` : run ? `${run.progress}% complete · ${definition.turnaround}` : "No data has been sent yet"}</p>
            </div>
          </div> : null}
        </header>

        <div className="service-workspace-grid">
          <div className="service-main-column">
            {!run && ["ownership_transfer", "insurance_cover", "fastag_setup", "compliance_calendar", "coverage_review", "public_scheme_check", "abha_records", "cashless_readiness", "residence_evidence", "aadhaar_address", "voter_address", "move_completion_pack", "business_premises", "udyam_readiness", "gst_readiness", "business_launch_pack", "retirement_record_review", "pension_pathway", "life_certificate_readiness", "retirement_pack"].includes(validKey) ? (
              <ServicePreparation
                id={id}
                nodeKey={validKey}
                evidence={state.evidence}
                facts={state.facts}
                pending={state.pending}
                error={state.error}
                action={definition.action}
                scenario={scenario}
                setScenario={setScenario}
                addEvidence={addEvidence}
                reviewEvidence={reviewEvidence}
                updateFacts={updateJourneyFacts}
                start={startService}
              />
            ) : !run ? (
              <section className="service-start-card panel">
                <span className="service-emblem"><Activity /></span>
                <h2>Everything needed is ready.</h2>
                <p>The simulation will show each validation and provider hand-off as it happens. You can refresh at any point without losing progress.</p>
                <div className="service-preflight">
                  <span><CheckCircle2 />Birth registration completed</span>
                  <span><CheckCircle2 />Required facts available</span>
                  <span><CheckCircle2 />Sandbox connection healthy</span>
                </div>
                <ProviderScenarioPicker value={scenario} onChange={setScenario} />
                <button className="primary-cta service-action" type="button" disabled={state.pending} onClick={() => void startService()}>
                  {definition.action}<ArrowRight />
                </button>
                <p className="service-consent-note"><ShieldCheck />This runs a simulation only. No production government service is contacted.</p>
              </section>
            ) : (
              <>
                <ServiceProgress run={run} stages={definition.stages} nextStageTitle={nextStage?.title} pending={state.pending} />
                {state.error || run.status === "failed" ? (
                  <section className="service-recovery panel" role="alert">
                    <div><RotateCw /><span><strong>{run.caseStatus === "action_required" ? "The provider needs more information" : run.caseStatus === "rejected" ? "This synthetic case was rejected" : "Progress is saved"}</strong><p>{state.error ?? run.actionMessage ?? "Retry from the last completed check."}</p>{run.reasonCode ? <small>Reason code: {run.reasonCode}</small> : null}</span></div>
                    {run?.caseStatus === "action_required" ? <button type="button" className="secondary-button" onClick={() => void updateJourneyFacts(id, { [`simulation.response.${validKey}`]: new Date().toISOString() }).then((saved) => saved && advanceService(id, validKey))}>Send clarification</button> : run?.caseStatus === "rejected" ? <button type="button" className="secondary-button" onClick={() => void updateJourneyFacts(id, { [`simulation.appeal.${validKey}`]: new Date().toISOString() }).then((saved) => saved && advanceService(id, validKey))}>Correct and appeal</button> : <button type="button" className="secondary-button" onClick={() => void advanceService(id, validKey)}>Retry provider check</button>}
                  </section>
                ) : null}
                {completed && run.artifact ? <ServiceArtifactView artifact={run.artifact} headingRef={artifactHeadingRef} /> : null}
              </>
            )}
          </div>

          <details className="service-details">
            <summary>Provider and data details</summary>
            <aside className="service-sidebar" aria-label="Connection details">
            <section className="panel service-connection-card">
              <div className="connection-heading"><span><Database /></span><div><small>Connected provider</small><strong>{definition.agency}</strong></div><i>Sandbox</i></div>
              <dl>
                <div><dt>Environment</dt><dd>Isolated evaluation</dd></div>
                <div><dt>Expected flow</dt><dd>{definition.turnaround}</dd></div>
                {run ? <><div><dt>Run ID</dt><dd className="technical-value">{run.runId}</dd></div><div><dt>Last update</dt><dd>{formatTimestamp(run.updatedAt)}</dd></div></> : null}
              </dl>
            </section>

            <section className="panel data-sharing-card">
              <h2><LockKeyhole />Data used for this step</h2>
              <ul>{definition.dataShared.map((item) => <li key={item}><Check />{item}</li>)}</ul>
              <p><ShieldCheck />Data stays inside this evaluation environment.</p>
            </section>

            {guidance ? <a className="official-guidance-link" href={guidance.href} target="_blank" rel="noreferrer">{guidance.label}<ExternalLink /></a> : null}
            </aside>
          </details>
        </div>

        {completed ? (
          <div className="service-footer-actions">
            <Link className="primary-cta" href={`/api/journeys/${id}/services/${validKey}/download`} prefetch={false}><FileDown />Download service record</Link>
            <Link className="secondary-button" href={`/journeys/${id}`}><Check />Continue journey</Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function ServicePreparation({ id, nodeKey, evidence, facts, pending, error, action, scenario, setScenario, addEvidence, reviewEvidence, updateFacts, start }: {
  id: string;
  nodeKey: SandboxServiceRun["nodeKey"];
  evidence: JourneyEvidence[];
  facts: Record<string, string>;
  pending: boolean;
  error: string | null;
  action: string;
  scenario: ProviderScenario;
  setScenario: (value: ProviderScenario) => void;
  addEvidence: (id: string, type: EvidenceType, file?: File) => Promise<boolean>;
  reviewEvidence: (id: string, evidenceId: string, approved: boolean, fields?: Record<string, string>) => Promise<boolean>;
  updateFacts: (id: string, facts: Record<string, string>) => Promise<boolean>;
  start: () => Promise<boolean>;
}) {
  const required = serviceEvidenceRequirements[nodeKey] ?? [];
  const missing = missingEvidence(nodeKey, evidence);
  const [consent, setConsent] = useState(false);
  const [mobileLast4, setMobileLast4] = useState(facts["fastag.mobileLast4"] ?? "4421");
  const [issuer, setIssuer] = useState(facts["fastag.issuer"] ?? "NHAI FASTag");
  const [householdRecord, setHouseholdRecord] = useState(facts["health.householdRecord"] ?? "not_sure");
  const [careCity, setCareCity] = useState(facts["health.careCity"] ?? "Hyderabad");
  const fastagReady = nodeKey !== "fastag_setup" || (/^\d{4}$/.test(mobileLast4) && issuer.length > 1);
  const healthReady = nodeKey !== "cashless_readiness" || careCity.trim().length > 1;

  async function begin() {
    if (nodeKey === "fastag_setup") {
      const saved = await updateFacts(id, { "fastag.mobileLast4": mobileLast4, "fastag.issuer": issuer });
      if (!saved) return;
    }
    if (nodeKey === "public_scheme_check") {
      const saved = await updateFacts(id, { "health.householdRecord": householdRecord });
      if (!saved) return;
    }
    if (nodeKey === "cashless_readiness") {
      const saved = await updateFacts(id, { "health.careCity": careCity });
      if (!saved) return;
    }
    await start();
  }

  return <section className="panel vehicle-service-preparation">
    <header><h2>{missing.length ? `${missing.length} ${missing.length === 1 ? "item" : "items"} needed before submission` : "Review and authorise this simulation"}</h2><p>The provider run stays locked until each required input has been verified.</p></header>
    {required.length ? <div className="evidence-requirements">{required.map((type) => {
      const item = evidence.findLast((candidate) => candidate.type === type && candidate.verificationStatus !== "rejected")
        ?? evidence.findLast((candidate) => candidate.type === type);
      const label = evidenceLabels[type];
      const verified = item?.verificationStatus === "verified";
      return <article className={verified ? "verified" : "missing"} key={type}>
        <span>{verified ? <CheckCircle2 /> : item ? <AlertTriangle /> : <FileUp />}</span><div><strong>{label.title}</strong><p>{item?.verificationStatus === "needs_review" ? "Check the values read from this document before it can be used." : item?.verificationStatus === "rejected" ? "This copy was not accepted. Upload another document." : label.description}</p>
          {item ? <><small>{item.fileName} · {(item.size / 1024).toFixed(1)} KB · {item.source === "sample" ? "Synthetic sample" : "Uploaded"} · {item.verificationStatus === "verified" ? "Verified" : item.verificationStatus === "needs_review" ? "Needs your review" : "Rejected"}</small>{verified ? <details className="evidence-details"><summary>View verified details</summary><dl>{Object.entries(item.extractedFields).map(([key, value]) => <div key={key}><dt>{key.replace(/([A-Z])/g, " $1")}</dt><dd>{value}</dd></div>)}</dl></details> : null}</> : null}
          {item?.verificationStatus === "needs_review" ? <EvidenceReview item={item} pending={pending} onReview={(approved, fields) => reviewEvidence(id, item.id, approved, fields)} /> : null}
        </div>
        <div className="evidence-actions">{item ? <><a href={`/api/journeys/${id}/evidence/${item.id}`} target="_blank" rel="noreferrer"><Eye />Preview</a>{item.verificationStatus === "rejected" ? <label><FileUp />Replace<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addEvidence(id, type, file); }} /></label> : null}</> : <>
          <label><FileUp />Upload<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) void addEvidence(id, type, file); }} /></label>
          <button type="button" onClick={() => void addEvidence(id, type)}>Use sample evidence</button>
        </>}</div>
      </article>;
    })}</div> : null}
    {nodeKey === "fastag_setup" ? <div className="fastag-inputs"><label htmlFor="mobile-last-four">Mobile number ending</label><span className="field-helper">Enter only the last four digits; the sandbox simulates OTP verification.</span><input id="mobile-last-four" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={mobileLast4} onChange={(event) => setMobileLast4(event.target.value.replace(/\D/g, ""))} /><label htmlFor="fastag-issuer">Issuer</label><select id="fastag-issuer" value={issuer} onChange={(event) => setIssuer(event.target.value)}><option>NHAI FASTag</option><option>State Bank of India</option><option>ICICI Bank</option></select></div> : null}
    {nodeKey === "public_scheme_check" ? <div className="fastag-inputs"><label htmlFor="household-record">Do you have a ration card or another household record?</label><span className="field-helper">This only changes the verification checklist. It does not decide eligibility.</span><select id="household-record" value={householdRecord} onChange={(event) => setHouseholdRecord(event.target.value)}><option value="yes">Yes</option><option value="not_sure">I’m not sure</option><option value="no">No</option></select></div> : null}
    {nodeKey === "cashless_readiness" ? <div className="fastag-inputs"><label htmlFor="care-city">City where you are likely to seek care</label><span className="field-helper">The final pack will remind you to verify the hospital’s current network status.</span><input id="care-city" value={careCity} onChange={(event) => setCareCity(event.target.value)} /></div> : null}
    <ProviderScenarioPicker value={scenario} onChange={setScenario} />
    <label className="simulation-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>I authorise this evaluation-only submission</strong><small>No production provider, bank account, or government record will be changed.</small></span></label>
    {error ? <p className="workflow-error" role="alert">{error}</p> : null}
    <button className="primary-cta service-action" type="button" disabled={pending || missing.length > 0 || !fastagReady || !healthReady || !consent} onClick={() => void begin()}>{pending ? "Saving requirements…" : action}<ArrowRight /></button>
  </section>;
}

function ProviderScenarioPicker({ value, onChange }: { value: ProviderScenario; onChange: (value: ProviderScenario) => void }) {
  return <details className="provider-scenario-picker">
    <summary>Test a different provider outcome</summary>
    <label htmlFor="provider-scenario">Synthetic case outcome</label>
    <select id="provider-scenario" value={value} onChange={(event) => onChange(event.target.value as ProviderScenario)}>
      <option value="success">Approved after review</option>
      <option value="delayed">Longer provider delay</option>
      <option value="clarification">Provider asks a question</option>
      <option value="rejected">Rejected, then appealed</option>
    </select>
    <p>This changes only the evaluation simulator so recovery paths can be tested.</p>
  </details>;
}

function EvidenceReview({ item, pending, onReview }: {
  item: JourneyEvidence;
  pending: boolean;
  onReview: (approved: boolean, fields?: Record<string, string>) => Promise<boolean>;
}) {
  const [fields, setFields] = useState(item.extractedFields);
  const failed = item.checks?.some((check) => check.status === "failed") ?? false;
  return <div className="evidence-review" role="group" aria-label={`Review ${item.fileName}`}>
    <div className="evidence-review-summary"><strong>{Math.round((item.analysisConfidence ?? 0) * 100)}% analysis confidence</strong><span>{item.scanStatus === "clean" ? "Safety check passed" : "Safety check needs attention"}</span></div>
    {item.checks?.length ? <ul>{item.checks.map((check) => <li className={check.status} key={`${check.label}-${check.detail}`}><span>{check.status === "passed" ? <Check /> : <AlertTriangle />}</span><div><strong>{check.label}</strong><p>{check.detail}</p></div></li>)}</ul> : null}
    {Object.keys(fields).length ? <fieldset><legend>Values read from the document</legend>{Object.entries(fields).map(([fieldKey, value]) => <label key={fieldKey}><span>{fieldKey.replace(/([A-Z])/g, " $1")}</span><input value={value} onChange={(event) => setFields((current) => ({ ...current, [fieldKey]: event.target.value }))} /></label>)}</fieldset> : <p className="workflow-error">No supported values were found. Upload a clearer copy.</p>}
    <div className="evidence-review-actions"><button type="button" className="secondary-button" disabled={pending} onClick={() => void onReview(false)}>Reject this copy</button><button type="button" disabled={pending || failed || !Object.keys(fields).length} onClick={() => void onReview(true, fields)}>Confirm and use</button></div>
  </div>;
}

function ServiceProgress({ run, stages, nextStageTitle, pending }: {
  run: SandboxServiceRun;
  stages: typeof serviceWorkflowDefinitions.child_health_record.stages;
  nextStageTitle?: string;
  pending: boolean;
}) {
  const completed = run.status === "completed";
  return (
    <section className="panel service-progress-card">
      <header>
        <div><span className="progress-icon">{run.status === "completed" ? <CheckCircle2 /> : <LoaderCircle className="service-spinner" />}</span><div><h2>{run.status === "completed" ? "All checks completed" : pending ? "Running provider check…" : nextStageTitle ?? "Finalising result"}</h2></div></div>
        <strong className="progress-number">{run.progress}%</strong>
      </header>
      <div className="service-progress-track" aria-label={`${run.progress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={run.progress}><span style={{ width: `${run.progress}%` }} /></div>
      <details className="service-checks" open={!completed ? true : undefined} key={run.status}>
        <summary>{completed ? "View the 4 completed checks" : "Checks in progress"}</summary>
      <ol className="service-timeline">
        {stages.map((stage, index) => {
          const event = run.events.find((candidate) => candidate.stageKey === stage.key);
          const active = !event && index === run.currentStage && run.status !== "completed";
          return <li key={stage.key} className={event ? "done" : active ? "active" : "upcoming"}>
            <span className="timeline-marker">{event ? <Check /> : active ? <LoaderCircle className="service-spinner" /> : <Circle />}</span>
            <div><strong>{stage.title}</strong><p>{event?.detail ?? (active ? "The sandbox adapter is working on this check." : "Waiting for the previous check.")}</p></div>
            <time dateTime={event?.occurredAt}>{event ? formatTimestamp(event.occurredAt) : active ? "In progress" : "Pending"}</time>
          </li>;
        })}
      </ol>
      </details>
      <footer><Clock3 />Started {formatTimestamp(run.startedAt)}<span>Receipt {run.receipt}</span></footer>
    </section>
  );
}

function ServiceArtifactView({ artifact, headingRef }: { artifact: ServiceArtifact; headingRef: RefObject<HTMLHeadingElement | null> }) {
  return (
    <section className="panel service-artifact">
      <header><span><BadgeCheck /></span><div><h2 ref={headingRef} tabIndex={-1}>{artifact.title}</h2><p>{artifact.subtitle}</p></div><div className="artifact-reference"><small>{artifact.referenceLabel}</small><strong>{artifact.referenceValue}</strong></div></header>
      <dl className="artifact-facts">{artifact.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd><span>{fact.value}</span>{fact.status ? <span className={`artifact-status ${fact.status}`}>{statusLabel(fact.status)}</span> : null}</dd></div>)}</dl>
      {artifact.groups.map((group) => <details className="artifact-group" key={group.title}><summary><h3>{group.title}</h3><span>{group.items.length} {group.items.length === 1 ? "item" : "items"}</span></summary>{group.description ? <p>{group.description}</p> : null}<div>{group.items.map((item) => <article key={item.title}><span className={`artifact-item-icon ${item.status}`}>{item.status === "verified" || item.status === "ready" ? <CheckCircle2 /> : item.status === "due" || item.status === "review" ? <Clock3 /> : <Circle />}</span><div><strong>{item.title}</strong><p>{item.meta}</p>{item.detail ? <small>{item.detail}</small> : null}</div><span className={`artifact-status ${item.status}`}>{statusLabel(item.status)}</span></article>)}</div></details>)}
      <p className="artifact-notice"><ShieldCheck />{artifact.notice}</p>
    </section>
  );
}
