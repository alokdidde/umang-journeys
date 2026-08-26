"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useEffectReducer } from "use-effect-reducer";
import { Armchair, ArrowLeft, ArrowRight, Baby, Car, CheckCircle2, CircleHelp, FileCheck2, HeartPulse, House, LoaderCircle, Mic, RefreshCw, ShieldCheck, Sparkles, Store, UserRound } from "lucide-react";
import { useJourney } from "@/components/journey-provider";
import { intakeResultSchema } from "@/domain/intake-analysis";
import { initialIntakeResolutionState, intakeResolutionReducer } from "@/domain/intake-resolution-state";

const journeyMeta = {
  having_a_baby: { Icon: Baby, label: "New baby journey", templateId: "new-baby.india.v1" },
  buying_a_vehicle: { Icon: Car, label: "Vehicle journey", templateId: "vehicle-purchase.india.v1" },
  managing_health_cover: { Icon: HeartPulse, label: "Health & insurance", templateId: "health-insurance.india.v1" },
  moving_home: { Icon: House, label: "Moving home", templateId: "moving-home.india.v1" },
  starting_a_business: { Icon: Store, label: "Starting a business", templateId: "business-setup.india.v1" },
  retirement: { Icon: Armchair, label: "Retirement", templateId: "retirement.india.v1" },
} as const;

const choiceLabels = {
  yes: "Yes",
  not_sure: "Not sure",
  no: "No",
  both: "Both parents",
  mother: "My mother",
  father: "My father",
} as const;

const factLabels: Record<string, string> = {
  "birth.city": "Birth city",
  "birth.state": "Birth state",
  "birth.setting": "Birth setting",
  "child.dateOfBirth": "Date of birth",
  "vehicle.purchaseType": "Purchase type",
  "vehicle.city": "Vehicle city",
  "vehicle.state": "Vehicle state",
  "vehicle.makeModel": "Vehicle",
  "vehicle.purchaseDate": "Purchase date",
  "person.city": "City",
  "person.state": "State",
  "health.coverageFor": "Cover for",
  "health.dependentRelationship": "Relationship",
  "move.newCity": "New city",
  "move.newState": "New state",
  "move.occupancy": "Home",
  "move.date": "Move date",
  "business.activity": "Business activity",
  "business.structure": "Business structure",
  "business.city": "Business city",
  "business.state": "Business state",
  "business.startDate": "Start date",
  "retirement.employmentSector": "Employment",
  "retirement.accountType": "Primary record",
  "retirement.date": "Retirement date",
};

function readable(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function apiErrorMessage(value: unknown) {
  if (typeof value === "object" && value !== null && "message" in value && typeof value.message === "string") return value.message;
  return "AI could not analyse that request. Please try again.";
}

export default function IntakePage() {
  const { state, dispatch, createJourney } = useJourney();
  const router = useRouter();
  const [analysis, dispatchAnalysis] = useEffectReducer(intakeResolutionReducer, initialIntakeResolutionState);
  const [analysisRequest, setAnalysisRequest] = useState(() => ({ statement: state.statement.trim(), attempt: 0 }));
  const [parentSelection, setParentSelection] = useState<"both" | "mother" | "father" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const statement = analysisRequest.statement;
    void fetch("/api/intake/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statement }),
      signal: controller.signal,
    }).then(async (response) => {
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(apiErrorMessage(body));
      const parsed = intakeResultSchema.safeParse(body);
      if (!parsed.success) throw new Error("AI returned an invalid analysis. Please try again.");
      dispatchAnalysis({ type: "resolution_succeeded", resolution: parsed.data, statement });
    }).catch((caught) => {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      dispatchAnalysis({ type: "resolution_failed", message: caught instanceof Error ? caught.message : "AI could not analyse that request. Please try again." });
    });
    return () => controller.abort();
  }, [analysisRequest, dispatchAnalysis]);

  const resolution = analysis.resolution;
  const stale = analysis.phase === "ready" && analysis.analysedStatement !== state.statement.trim();
  const meta = resolution ? journeyMeta[resolution.lifeEvent.value] : null;
  const asksForParents = resolution?.clarification.key === "health.subjects";
  const standardAnswer = resolution ? resolution.clarification.key === "health.currentCover" ? state.healthCoverageKnown
    : resolution.clarification.key === "vehicle.ownershipTransferred" ? state.vehicleOwnershipTransferred
      : resolution.clarification.key === "move.hasAddressEvidence" ? state.moveAddressEvidenceKnown
        : resolution.clarification.key === "business.hasPremisesProof" ? state.businessPremisesProofKnown
          : resolution.clarification.key === "retirement.hasAccountStatement" ? state.retirementStatementKnown
            : resolution.clarification.key === "birth.registeredByHospital" ? state.hospitalRegistered
              : null : null;
  const clarificationAnswer = asksForParents ? parentSelection : standardAnswer;

  function requestAnalysis() {
    setParentSelection(null);
    dispatchAnalysis({ type: "retry_requested" });
    setAnalysisRequest((request) => ({ statement: state.statement.trim(), attempt: request.attempt + 1 }));
  }

  function selectStandardChoice(value: "yes" | "not_sure" | "no") {
    const key = resolution?.clarification.key;
    if (key === "health.currentCover") dispatch({ type: "set_health_coverage_known", value });
    else if (key === "vehicle.ownershipTransferred") dispatch({ type: "set_vehicle_ownership_transferred", value });
    else if (key === "move.hasAddressEvidence") dispatch({ type: "set_move_address_evidence_known", value });
    else if (key === "business.hasPremisesProof") dispatch({ type: "set_business_premises_proof_known", value });
    else if (key === "retirement.hasAccountStatement") dispatch({ type: "set_retirement_statement_known", value });
    else if (key === "birth.registeredByHospital") dispatch({ type: "set_hospital_registered", value });
  }

  async function buildJourney() {
    if (!resolution || !meta || stale || !clarificationAnswer) return;
    try {
      const facts = Object.fromEntries(resolution.facts.map((fact) => [fact.key, fact.value]));
      if (resolution.lifeEvent.value === "managing_health_cover" && asksForParents && parentSelection) {
        const parents = parentSelection === "both" ? ["mother", "father"] as const : [parentSelection];
        const journeyIds: string[] = [];
        for (const parent of parents) {
          const journeyId = await createJourney({
            ...facts,
            "intake.statement": analysis.analysedStatement ?? state.statement,
            "intake.resolver": "ai_gateway",
            "person.name": parent === "mother" ? "Mother" : "Father",
            "health.coverageFor": "dependent",
            "health.dependentRelationship": parent,
          }, meta.templateId);
          if (!journeyId) return;
          journeyIds.push(journeyId);
        }
        router.push(journeyIds.length > 1 ? "/journeys" : `/journeys/${journeyIds[0]}`);
        return;
      }

      const journeyId = await createJourney({
        ...facts,
        "intake.statement": analysis.analysedStatement ?? state.statement,
        "intake.resolver": "ai_gateway",
        [resolution.clarification.key]: clarificationAnswer,
      }, meta.templateId);
      if (journeyId) router.push(`/journeys/${journeyId}`);
    } catch (caught) {
      dispatch({ type: "operation_failed", message: caught instanceof Error ? caught.message : "Journey could not be created." });
    }
  }

  const HeadingIcon = meta?.Icon ?? Sparkles;

  return <main className="page intake-page">
    <div className="subtle-scene" aria-hidden="true" />
    <div className="intake-layout content-layer">
      <section className="intake-content">
        <div className="intake-topline"><Link href="/" className="back-link"><ArrowLeft />Back</Link><span>Step 1 of 2</span></div>
        <header className="screen-heading"><p className="eyebrow"><HeadingIcon />{meta?.label ?? "Understanding your request"}</p><h1>Tell us what you need.</h1><p><Sparkles />AI will read your statement and ask the next useful question.</p></header>
        <div className="panel statement-panel">
          <label htmlFor="statement">Your statement</label>
          <div className="statement-input"><textarea id="statement" value={state.statement} onChange={(event) => dispatch({ type: "set_statement", value: event.target.value })} /><Mic aria-label="Voice input unavailable" /></div>
          {resolution && meta && !stale ? <details className="understood-details"><summary>What UMANG understood</summary><div className="fact-chips">
            <span className="green"><meta.Icon />{meta.label}</span>
            {resolution.facts.slice(0, 4).map((fact) => <span className="blue" key={fact.key}><FileCheck2 />{factLabels[fact.key] ?? readable(fact.key.split(".").at(-1) ?? fact.key)}: {readable(fact.value)}</span>)}
            {resolution.facts.length === 0 ? <span className="amber"><ShieldCheck />No extra details assumed</span> : null}
          </div></details> : null}
        </div>

        {analysis.phase === "analysing" ? <div className="panel question-panel workflow-state" role="status" aria-live="polite"><LoaderCircle className="service-spinner" /><div><h2>Analysing your request…</h2><p>Vercel AI is identifying the Life Event and the next question.</p></div></div> : null}

        {analysis.phase === "error" ? <div className="panel question-panel analysis-error" role="alert"><div className="question-title"><span><CircleHelp /></span><div><h2>We couldn’t analyse this request</h2><p>{analysis.error}</p></div></div><button type="button" className="secondary-button" onClick={requestAnalysis}><RefreshCw />Try AI analysis again</button></div> : null}

        {stale ? <div className="panel question-panel analysis-error"><div className="question-title"><span><RefreshCw /></span><div><h2>Your statement changed</h2><p>Analyse the updated statement before creating a journey.</p></div></div><button type="button" className="secondary-button" onClick={requestAnalysis}><Sparkles />Analyse updated statement</button></div> : null}

        {analysis.phase === "ready" && resolution && !stale ? <>
          <div className="panel question-panel">
            <div className="question-title"><span><ShieldCheck /></span><div><h2>{resolution.clarification.question}</h2><p>{asksForParents ? "Each person needs a separate health record and eligibility check. Choose both to create one journey for each parent." : "Your answer helps AI prepare the right first step without assuming official status."}</p></div></div>
            <div className="choice-row">
              {resolution.clarification.key === "health.subjects"
                ? resolution.clarification.choices.map((value) => <button type="button" className={parentSelection === value ? "selected" : ""} onClick={() => setParentSelection(value)} key={value}><UserRound />{choiceLabels[value]}</button>)
                : resolution.clarification.choices.map((value) => {
                  const Icon = value === "yes" ? CheckCircle2 : CircleHelp;
                  return <button type="button" className={standardAnswer === value ? "selected" : ""} onClick={() => selectStandardChoice(value)} key={value}><Icon />{choiceLabels[value]}</button>;
                })}
            </div>
          </div>
          {!clarificationAnswer ? <p className="inline-prompt">Choose one answer to continue.</p> : null}
          {state.error ? <p className="workflow-error" role="alert">{state.error}</p> : null}
          <div className="right-cta"><button type="button" className="primary-cta" disabled={!clarificationAnswer || state.pending} onClick={buildJourney}>{state.pending ? "Building your journey…" : "Continue"}<ArrowRight /></button><small>We’ll use the AI result and your answer to show the right steps.</small></div>
        </> : null}
      </section>
    </div>
  </main>;
}
