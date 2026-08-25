"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Baby,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Database,
  FileCheck2,
  House,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useJourney } from "@/components/journey-provider";

const wards = [
  { name: "Ward 72 — Serilingampally", hint: "Includes western Hyderabad and the hospital area" },
  { name: "Ward 95 — Jubilee Hills", hint: "Matches the address in your demo profile" },
];

export default function RegistrationPage() {
  const { state, dispatch, loadJourney, submitRegistration } = useJourney();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const answered = Number(Boolean(state.form.childName.trim())) + Number(Boolean(state.form.localWard));

  useEffect(() => {
    if (id && state.journeyId !== id) void loadJourney(id);
  }, [id, loadJourney, state.journeyId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const valid = state.form.childName.trim() && state.form.localWard.trim();
    dispatch({ type: "submit_registration" });
    if (!valid) return;
    if (await submitRegistration(id)) router.push(`/journeys/${id}/success`);
  }

  if (state.pending && state.journeyId !== id) return <main className="page workflow-state"><p>Loading the prepared application…</p></main>;
  if (state.error && state.journeyId !== id) return <main className="page workflow-state"><h1>We couldn’t load this application.</h1><p>{state.error}</p></main>;

  return (
    <main className="page ai-registration-page">
      <div className="subtle-scene" aria-hidden="true" />

      <header className="ai-registration-hero content-layer">
        <span className="eyebrow"><Sparkles /> UMANG Assist</span>
        <h1>Your application is nearly ready.</h1>
        <p>I matched the hospital record with your demo profile. Instead of showing you a long form, I only need two answers.</p>
        <div className="ai-readiness" aria-label="Application preparation summary">
          <span><CheckCircle2 /> 10 facts prepared</span>
          <i aria-hidden="true" />
          <span><Database /> 2 trusted sources</span>
          <i aria-hidden="true" />
          <span className="needs-answer">2 answers needed</span>
        </div>
      </header>

      <div className="assist-layout content-layer">
        <form className="assist-conversation panel" onSubmit={submit} noValidate>
          <div className="assist-agent">
            <span className="assist-avatar" aria-hidden="true"><Sparkles /></span>
            <div><strong>Let’s finish this together</strong><small>Birth registration assistant · Demo</small></div>
            <span className="online-dot">Ready</span>
          </div>

          <div className="conversation-body">
            <section className="conversation-turn">
              <div className="assistant-bubble">
                <span className="mini-assist-avatar" aria-hidden="true"><Sparkles /></span>
                <div>
                  <span className="turn-label">UMANG Assist</span>
                  <p>What name should appear on the child’s birth record?</p>
                  <small>Enter it exactly as you want it shown on the certificate.</small>
                </div>
              </div>
              <label className={state.formErrors.childName ? "answer-box error" : "answer-box"}>
                <span>Child’s name</span>
                <div className="answer-input">
                  <Baby aria-hidden="true" />
                  <input
                    value={state.form.childName}
                    onChange={(event) => dispatch({ type: "set_field", field: "childName", value: event.target.value })}
                    placeholder="e.g. Aarav Sharma"
                    aria-invalid={Boolean(state.formErrors.childName)}
                    autoComplete="off"
                  />
                  {state.form.childName.trim() && <CheckCircle2 className="answer-complete" aria-label="Answer added" />}
                </div>
                {state.formErrors.childName && <em>{state.formErrors.childName}</em>}
              </label>
            </section>

            <section className="conversation-turn">
              <div className="assistant-bubble">
                <span className="mini-assist-avatar" aria-hidden="true"><Sparkles /></span>
                <div>
                  <span className="turn-label">UMANG Assist</span>
                  <p>Which local ward should receive the registration?</p>
                  <small>I found two likely matches from the hospital and address. You stay in control.</small>
                </div>
              </div>
              <fieldset className={state.formErrors.localWard ? "ward-answer error" : "ward-answer"}>
                <legend className="sr-only">Local ward / area</legend>
                {wards.map((ward) => {
                  const selected = state.form.localWard === ward.name;
                  return (
                    <button
                      type="button"
                      className={selected ? "ward-choice selected" : "ward-choice"}
                      aria-pressed={selected}
                      onClick={() => dispatch({ type: "set_field", field: "localWard", value: ward.name })}
                      key={ward.name}
                    >
                      <span className="ward-pin"><MapPin /></span>
                      <span><strong>{ward.name}</strong><small>{ward.hint}</small></span>
                      <span className="choice-check" aria-hidden="true">{selected && <Check />}</span>
                    </button>
                  );
                })}
                {state.formErrors.localWard && <em>{state.formErrors.localWard}</em>}
              </fieldset>
            </section>
          </div>

          <div className="assist-submit">
            <div className="completion-meter">
              <span><strong>{answered} of 2</strong> answers added</span>
              <span className="meter-track"><i data-ready={answered} /></span>
            </div>
            <button type="submit" className="primary-cta" aria-label="Submit Sandbox Registration" disabled={state.pending}>
              {state.pending ? "Contacting registry sandbox…" : "Review & create sandbox record"} <ArrowRight />
            </button>
          </div>
          {state.error && <p className="workflow-error in-panel" role="alert">{state.error}</p>}
          <p className="nothing-sent"><ShieldCheck /> Nothing has been submitted. This prototype uses synthetic data only.</p>
        </form>

        <aside className="application-preview panel" aria-label="AI-prepared application preview">
          <div className="preview-header">
            <span className="preview-icon"><FileCheck2 /></span>
            <div><span>AI-prepared application</span><h2>Birth registration</h2></div>
            <span className="draft-pill">Draft</span>
          </div>

          <div className="preview-progress">
            <div><span>Application completeness</span><strong>{10 + answered}/12</strong></div>
            <span className="preview-track"><i data-ready={answered} /></span>
          </div>

          <div className="source-match">
            <span><Building2 /> Apollo Hospital record</span>
            <span><UserRound /> Ananya’s demo profile</span>
            <small><CheckCircle2 /> Sources matched successfully</small>
          </div>

          <div className="prepared-facts">
            <Fact Icon={Baby} label="Child" value={state.form.childName || "Waiting for your answer"} pending={!state.form.childName} source="Your answer" />
            <Fact Icon={CalendarDays} label="Birth" value="24 Aug 2026 · 08:24 AM · Female · 3.12 kg" source="Hospital" />
            <Fact Icon={UserRound} label="Parents" value="Ananya Sharma · Rahul Sharma" source="Profile" />
            <Fact Icon={Building2} label="Hospital" value="Apollo Hospital · Hyderabad" source="Hospital" />
            <Fact Icon={House} label="Home" value="12, Jubilee Hills · Hyderabad · 500033" source="Profile" />
            <Fact Icon={MapPin} label="Local ward" value={state.form.localWard || "Waiting for your answer"} pending={!state.form.localWard} source="Your answer" />
          </div>

          <div className="preview-note"><ShieldCheck /><span><strong>Reviewable, not mysterious</strong><small>Every prepared fact shows where it came from. You can change your two answers before creating the demo record.</small></span></div>
        </aside>
      </div>
    </main>
  );
}

function Fact({ Icon, label, value, source, pending = false }: { Icon: typeof Baby; label: string; value: string; source: string; pending?: boolean }) {
  return (
    <div className={pending ? "prepared-fact pending" : "prepared-fact"}>
      <span className="fact-icon"><Icon /></span>
      <div><span className="fact-label">{label}</span><span className="fact-value">{value}</span></div>
      <small>{pending ? "Needed" : source}</small>
    </div>
  );
}
