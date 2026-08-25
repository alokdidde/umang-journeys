"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Building2, CalendarDays, CheckCircle2, CircleHelp, MapPin, Mic, ShieldCheck, Sparkles } from "lucide-react";
import { useJourney } from "@/components/journey-provider";

const choices = [
  { value: "yes" as const, label: "Yes", icon: CheckCircle2 },
  { value: "not_sure" as const, label: "Not sure", icon: CircleHelp },
  { value: "no" as const, label: "No", icon: CircleHelp },
];

export default function IntakePage() {
  const { state, dispatch } = useJourney();
  const router = useRouter();
  async function buildJourney() {
    if (!state.hospitalRegistered) return;
    try {
      await fetch("/api/intake/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ statement: state.statement }) });
    } finally {
      router.push("/journeys/demo-new-baby");
    }
  }
  return (
    <main className="page intake-page">
      <div className="subtle-scene" aria-hidden="true" />
      <div className="intake-layout content-layer">
        <aside className="intake-sidebar">
          <Link href="/" className="back-link"><ArrowLeft />Change journey</Link>
          <div className="chosen-event"><span className="event-icon rose"><Baby /></span><strong>Having a Baby</strong><Link href="/">Change</Link></div>
          <ol className="vertical-steps">
            <li className="active"><span>1</span>Tell us what happened</li>
            <li><span>2</span>Confirm what we know</li>
            <li><span>3</span>Your journey</li>
          </ol>
          <p className="sidebar-trust"><ShieldCheck /> Your information is synthetic and private.</p>
        </aside>

        <section className="intake-content">
          <header className="screen-heading"><h1>Tell us what happened.</h1><p><Sparkles />Simply describe your situation in your own words.</p></header>
          <div className="panel statement-panel">
            <label htmlFor="statement">Your statement</label>
            <div className="statement-input"><textarea id="statement" value={state.statement} onChange={(event) => dispatch({ type: "set_statement", value: event.target.value })} /><Mic aria-label="Voice input unavailable" /></div>
            <span className="field-hint">We understood:</span>
            <div className="fact-chips">
              <span className="rose"><Baby />Having a baby</span><span className="blue"><Building2 />Hospital birth</span><span className="green"><MapPin />Hyderabad</span><span className="purple"><MapPin />Telangana</span><span className="amber"><CalendarDays />24 August 2026</span>
            </div>
          </div>
          <div className="panel question-panel">
            <div className="question-title"><span><CircleHelp /></span><div><h2>Has the hospital already registered the birth?</h2><p>This helps us include the right next steps in your journey.</p></div></div>
            <div className="choice-row">
              {choices.map(({ value, label, icon: Icon }) => <button type="button" className={state.hospitalRegistered === value ? "selected" : ""} onClick={() => dispatch({ type: "set_hospital_registered", value })} key={value}><Icon />{label}</button>)}
            </div>
          </div>
          {!state.hospitalRegistered && <p className="inline-prompt">Choose one answer to continue.</p>}
          <div className="right-cta"><button type="button" className="primary-cta" disabled={!state.hospitalRegistered} onClick={buildJourney}>Build My Journey<ArrowRight /></button><small>We’ll use your answers to build the right journey for you.</small></div>
        </section>
      </div>
    </main>
  );
}
