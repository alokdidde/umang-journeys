"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, Building2, CalendarDays, Car, CheckCircle2, CircleHelp, FileCheck2, HeartPulse, MapPin, Mic, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useJourney } from "@/components/journey-provider";

const choices = [
  { value: "yes" as const, label: "Yes", icon: CheckCircle2 },
  { value: "not_sure" as const, label: "Not sure", icon: CircleHelp },
  { value: "no" as const, label: "No", icon: CircleHelp },
];

export default function IntakePage() {
  const { state, dispatch, createJourney } = useJourney();
  const router = useRouter();
  const isHealth = /health|medical|cashless|abha|ayushman|pm-?jay|health insurance/i.test(state.statement);
  const isVehicle = /\b(vehicle|car|bike|scooter|motorcycle|nexon|creta)\b/i.test(state.statement);
  const clarificationAnswer = isHealth ? state.healthCoverageKnown : isVehicle ? state.vehicleOwnershipTransferred : state.hospitalRegistered;
  async function buildJourney() {
    if (!clarificationAnswer) return;
    try {
      const response = await fetch("/api/intake/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ statement: state.statement }) });
      const resolved = await response.json() as { lifeEvent?: { value: "having_a_baby" | "buying_a_vehicle" | "managing_health_cover" }; facts?: Array<{ key: string; value: string }>; message?: string; resolver?: string };
      if (!response.ok) throw new Error(resolved.message ?? "We could not understand that life event.");
      const facts = Object.fromEntries((resolved.facts ?? []).map((fact) => [fact.key, fact.value]));
      const vehicleJourney = resolved.lifeEvent?.value === "buying_a_vehicle";
      const healthJourney = resolved.lifeEvent?.value === "managing_health_cover";
      const journeyId = await createJourney({
        ...facts,
        "intake.statement": state.statement,
        ...(healthJourney ? { "health.currentCover": clarificationAnswer } : vehicleJourney ? { "vehicle.ownershipTransferred": clarificationAnswer } : { "birth.registeredByHospital": clarificationAnswer }),
        "intake.resolver": resolved.resolver ?? "deterministic",
        ...(vehicleJourney || healthJourney ? {} : { "hospital.name": /apollo/i.test(state.statement) ? "Apollo Hospital" : "Hospital record" }),
      }, healthJourney ? "health-insurance.india.v1" : vehicleJourney ? "vehicle-purchase.india.v1" : "new-baby.india.v1");
      if (journeyId) router.push(`/journeys/${journeyId}`);
    } catch (error) {
      dispatch({ type: "operation_failed", message: error instanceof Error ? error.message : "Journey could not be created." });
    }
  }
  return (
    <main className="page intake-page">
      <div className="subtle-scene" aria-hidden="true" />
      <div className="intake-layout content-layer">
        <section className="intake-content">
          <div className="intake-topline"><Link href="/" className="back-link"><ArrowLeft />Back</Link><span>Step 1 of 2</span></div>
          <header className="screen-heading"><p className="eyebrow">{isHealth ? <HeartPulse /> : isVehicle ? <Car /> : <Baby />}{isHealth ? "Health & insurance" : isVehicle ? "Vehicle journey" : "New baby journey"}</p><h1>Tell us what you need.</h1><p><Sparkles />Use your own words. A short sentence is enough.</p></header>
          <div className="panel statement-panel">
            <label htmlFor="statement">Your statement</label>
            <div className="statement-input"><textarea id="statement" value={state.statement} onChange={(event) => dispatch({ type: "set_statement", value: event.target.value })} /><Mic aria-label="Voice input unavailable" /></div>
            <details className="understood-details"><summary>What UMANG understood</summary><div className="fact-chips">{isHealth ? <>
              <span className="green"><HeartPulse />Health cover</span><span className="blue"><UserRound />Ananya Sharma</span><span className="purple"><MapPin />Telangana</span><span className="amber"><ShieldCheck />Cover status to confirm</span>
            </> : isVehicle ? <>
              <span className="blue"><Car />Used vehicle</span><span className="green"><MapPin />Hyderabad</span><span className="purple"><MapPin />Telangana</span><span className="amber"><CalendarDays />25 August 2026</span>
            </> : <>
              <span className="rose"><Baby />Having a baby</span><span className="blue"><Building2 />Hospital birth</span><span className="green"><MapPin />Hyderabad</span><span className="purple"><MapPin />Telangana</span><span className="amber"><CalendarDays />24 August 2026</span>
            </>}</div></details>
          </div>
          <div className="panel question-panel">
            <div className="question-title"><span>{isHealth ? <ShieldCheck /> : isVehicle ? <FileCheck2 /> : <CircleHelp />}</span><div><h2>{isHealth ? "Do you have a health policy or government scheme card?" : isVehicle ? "Is the registration certificate already in your name?" : "Has the hospital already registered the birth?"}</h2><p>{isHealth ? "It is fine if you are unsure—we will help you verify, not guess." : isVehicle ? "We’ll include ownership transfer only when it is still needed." : "This helps us include the right next steps in your journey."}</p></div></div>
            <div className="choice-row">
              {choices.map(({ value, label, icon: Icon }) => <button type="button" className={clarificationAnswer === value ? "selected" : ""} onClick={() => dispatch({ type: isHealth ? "set_health_coverage_known" : isVehicle ? "set_vehicle_ownership_transferred" : "set_hospital_registered", value })} key={value}><Icon />{label}</button>)}
            </div>
          </div>
          {!clarificationAnswer && <p className="inline-prompt">Choose one answer to continue.</p>}
          {state.error && <p className="workflow-error" role="alert">{state.error}</p>}
          <div className="right-cta"><button type="button" className="primary-cta" disabled={!clarificationAnswer || state.pending} onClick={buildJourney}>{state.pending ? "Building your journey…" : "Continue"}<ArrowRight /></button><small>We’ll use your answer to show the right steps.</small></div>
        </section>
      </div>
    </main>
  );
}
