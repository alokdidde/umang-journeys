"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Baby, Check, Mic, Search, Sparkles } from "lucide-react";
import { ScenicBackdrop, TrustNote } from "@/components/app-shell";
import { lifeEvents } from "@/components/icons";
import { useJourney } from "@/components/journey-provider";

export default function HomePage() {
  const { state, dispatch } = useJourney();
  const [query, setQuery] = useState(state.statement);
  const router = useRouter();
  function start() {
    dispatch({ type: "set_statement", value: query.trim() || state.statement });
    router.push("/intake");
  }
  return (
    <main className="page home-page">
      <ScenicBackdrop />
      <section className="hero content-layer">
        <div className="eyebrow"><Sparkles size={16} /> Citizen services, reorganised around you</div>
        <h1>Life happens. We guide you.</h1>
        <p>Tell us what happened in your life. We’ll assemble the right government journey around you.</p>
        <form className="life-search" onSubmit={(event) => { event.preventDefault(); start(); }}>
          <Search aria-hidden="true" />
          <input aria-label="Describe your life event" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="I had a baby, we moved home, I bought a vehicle…" />
          <span className="mic-muted" title="Voice input is coming later"><Mic /></span>
        </form>
      </section>

      <section className="event-grid content-layer" aria-label="Life events">
        {lifeEvents.map(({ key, label, Icon, active, tone }) => (
          <button key={key} className={`event-card ${active ? "active" : ""}`} onClick={active ? start : undefined} type="button" aria-disabled={!active}>
            {active && <span className="selected-badge"><Check size={15} /></span>}
            {!active && <span className="preview-badge">Preview</span>}
            <span className={`event-icon ${tone}`}><Icon /></span>
            <strong>{label}</strong>
          </button>
        ))}
      </section>

      <section className="how-it-works content-layer">
        <div className="section-rule"><span>How it works</span></div>
        <div className="steps-row">
          <article><span>1</span><div><strong>Tell us the life event</strong><p>In your own words—type it naturally.</p></div></article>
          <ArrowRight />
          <article><span>2</span><div><strong>Review what’s known</strong><p>Confirm facts from your statement and records.</p></div></article>
          <ArrowRight />
          <article><span>3</span><div><strong>Follow one journey</strong><p>See exactly what to do, step by step.</p></div></article>
        </div>
      </section>

      <div className="primary-cta-wrap content-layer">
        <button className="primary-cta" onClick={start} type="button"><span className="cta-baby"><Baby /></span>Start New Baby Journey<ArrowRight /></button>
        <TrustNote />
      </div>
    </main>
  );
}
