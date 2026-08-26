"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Armchair, ArrowLeft, ArrowRight, Baby, Building2, CalendarDays, Car, CheckCircle2, CircleHelp, FileCheck2, HeartPulse, House, MapPin, Mic, ShieldCheck, Sparkles, Store, UserRound } from "lucide-react";
import { useJourney } from "@/components/journey-provider";
import { detectLifeEvent } from "@/domain/intake-intent";

const choices = [
  { value: "yes" as const, label: "Yes", icon: CheckCircle2 },
  { value: "not_sure" as const, label: "Not sure", icon: CircleHelp },
  { value: "no" as const, label: "No", icon: CircleHelp },
];

export default function IntakePage() {
  const { state, dispatch, createJourney } = useJourney();
  const router = useRouter();
  const detectedLifeEvent = detectLifeEvent(state.statement);
  const intent = detectedLifeEvent === "managing_health_cover" ? "health" : detectedLifeEvent === "buying_a_vehicle" ? "vehicle" : detectedLifeEvent === "moving_home" ? "move" : detectedLifeEvent === "starting_a_business" ? "business" : detectedLifeEvent === "retirement" ? "retirement" : "baby";
  const clarificationAnswer = intent === "health" ? state.healthCoverageKnown : intent === "vehicle" ? state.vehicleOwnershipTransferred : intent === "move" ? state.moveAddressEvidenceKnown : intent === "business" ? state.businessPremisesProofKnown : intent === "retirement" ? state.retirementStatementKnown : state.hospitalRegistered;
  const heading = {
    health: [HeartPulse, "Health & insurance"], vehicle: [Car, "Vehicle journey"], move: [House, "Moving home"], business: [Store, "Starting a business"], retirement: [Armchair, "Retirement"], baby: [Baby, "New baby journey"],
  } as const;
  const question = {
    health: ["Do you have a health policy or government scheme card?", "It is fine if you are unsure—we will help you verify, not guess."],
    vehicle: ["Is the registration certificate already in your name?", "We’ll include ownership transfer only when it is still needed."],
    move: ["Do you have a document for the new address?", "A rent agreement, utility bill, or property record can start the evidence check."],
    business: ["Do you have a document for the principal place of business?", "A lease, owner consent, utility bill, or property record can support the next check."],
    retirement: ["Do you have a provident-fund, NPS, or pension statement?", "A synthetic sample is available if you want to test the complete flow."],
    baby: ["Has the hospital already registered the birth?", "This helps us include the right next steps in your journey."],
  } as const;
  const HeadingIcon = heading[intent][0];
  async function buildJourney() {
    if (!clarificationAnswer) return;
    try {
      const response = await fetch("/api/intake/resolve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ statement: state.statement }) });
      const resolved = await response.json() as { lifeEvent?: { value: "having_a_baby" | "buying_a_vehicle" | "managing_health_cover" | "moving_home" | "starting_a_business" | "retirement" }; facts?: Array<{ key: string; value: string }>; message?: string; resolver?: string };
      if (!response.ok) throw new Error(resolved.message ?? "We could not understand that life event.");
      const facts = Object.fromEntries((resolved.facts ?? []).map((fact) => [fact.key, fact.value]));
      const vehicleJourney = resolved.lifeEvent?.value === "buying_a_vehicle";
      const healthJourney = resolved.lifeEvent?.value === "managing_health_cover";
      const movingJourney = resolved.lifeEvent?.value === "moving_home";
      const businessJourney = resolved.lifeEvent?.value === "starting_a_business";
      const retirementJourney = resolved.lifeEvent?.value === "retirement";
      const templateId = healthJourney ? "health-insurance.india.v1" : vehicleJourney ? "vehicle-purchase.india.v1" : movingJourney ? "moving-home.india.v1" : businessJourney ? "business-setup.india.v1" : retirementJourney ? "retirement.india.v1" : "new-baby.india.v1";
      const journeyId = await createJourney({
        ...facts,
        "intake.statement": state.statement,
        ...(healthJourney ? { "health.currentCover": clarificationAnswer } : vehicleJourney ? { "vehicle.ownershipTransferred": clarificationAnswer } : movingJourney ? { "move.hasAddressEvidence": clarificationAnswer } : businessJourney ? { "business.hasPremisesProof": clarificationAnswer } : retirementJourney ? { "retirement.hasAccountStatement": clarificationAnswer } : { "birth.registeredByHospital": clarificationAnswer }),
        "intake.resolver": resolved.resolver ?? "deterministic",
        ...(vehicleJourney || healthJourney || movingJourney || businessJourney || retirementJourney ? {} : { "hospital.name": /apollo/i.test(state.statement) ? "Apollo Hospital" : "Hospital record" }),
      }, templateId);
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
          <header className="screen-heading"><p className="eyebrow"><HeadingIcon />{heading[intent][1]}</p><h1>Tell us what you need.</h1><p><Sparkles />Use your own words. A short sentence is enough.</p></header>
          <div className="panel statement-panel">
            <label htmlFor="statement">Your statement</label>
            <div className="statement-input"><textarea id="statement" value={state.statement} onChange={(event) => dispatch({ type: "set_statement", value: event.target.value })} /><Mic aria-label="Voice input unavailable" /></div>
            <details className="understood-details"><summary>What UMANG understood</summary><div className="fact-chips">{intent === "health" ? <>
              <span className="green"><HeartPulse />Health cover</span><span className="blue"><UserRound />Ananya Sharma</span><span className="purple"><MapPin />Telangana</span><span className="amber"><ShieldCheck />Cover status to confirm</span>
            </> : intent === "vehicle" ? <>
              <span className="blue"><Car />Used vehicle</span><span className="green"><MapPin />Hyderabad</span><span className="purple"><MapPin />Telangana</span><span className="amber"><CalendarDays />25 August 2026</span>
            </> : intent === "move" ? <>
              <span className="green"><House />Moving home</span><span className="blue"><MapPin />Hyderabad</span><span className="purple"><Building2 />Rented home</span><span className="amber"><CalendarDays />September 2026</span>
            </> : intent === "business" ? <>
              <span className="purple"><Store />New business</span><span className="blue"><Building2 />Design services</span><span className="green"><MapPin />Hyderabad</span><span className="amber"><CalendarDays />September 2026</span>
            </> : intent === "retirement" ? <>
              <span className="amber"><Armchair />Retirement</span><span className="blue"><UserRound />Private employment</span><span className="purple"><FileCheck2 />EPFO record</span><span className="green"><CalendarDays />September 2026</span>
            </> : <>
              <span className="rose"><Baby />Having a baby</span><span className="blue"><Building2 />Hospital birth</span><span className="green"><MapPin />Hyderabad</span><span className="purple"><MapPin />Telangana</span><span className="amber"><CalendarDays />24 August 2026</span>
            </>}</div></details>
          </div>
          <div className="panel question-panel">
            <div className="question-title"><span>{intent === "health" ? <ShieldCheck /> : ["vehicle", "move", "business", "retirement"].includes(intent) ? <FileCheck2 /> : <CircleHelp />}</span><div><h2>{question[intent][0]}</h2><p>{question[intent][1]}</p></div></div>
            <div className="choice-row">
              {choices.map(({ value, label, icon: Icon }) => <button type="button" className={clarificationAnswer === value ? "selected" : ""} onClick={() => dispatch({ type: intent === "health" ? "set_health_coverage_known" : intent === "vehicle" ? "set_vehicle_ownership_transferred" : intent === "move" ? "set_move_address_evidence_known" : intent === "business" ? "set_business_premises_proof_known" : intent === "retirement" ? "set_retirement_statement_known" : "set_hospital_registered", value })} key={value}><Icon />{label}</button>)}
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
