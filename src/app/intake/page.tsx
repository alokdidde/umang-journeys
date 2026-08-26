"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useEffectReducer } from "use-effect-reducer";
import { Armchair, ArrowLeft, ArrowRight, Baby, Car, Check, CheckCircle2, CircleHelp, HeartPulse, House, LoaderCircle, Pencil, RefreshCw, ShieldCheck, Sparkles, Store, UserRound } from "lucide-react";
import { JourneyStarterComposer } from "@/components/journey-starter-composer";
import { useJourney } from "@/components/journey-provider";
import { intakeResultSchema } from "@/domain/intake-analysis";
import { intakeExperience } from "@/domain/intake-experience";
import { initialIntakeResolutionState, intakeResolutionReducer } from "@/domain/intake-resolution-state";

const journeyMeta = {
  having_a_baby: { Icon: Baby, label: "Having a Baby", shortLabel: "baby", templateId: "new-baby.india.v1" },
  buying_a_vehicle: { Icon: Car, label: "Buying a Vehicle", shortLabel: "vehicle", templateId: "vehicle-purchase.india.v1" },
  managing_health_cover: { Icon: HeartPulse, label: "Health & Insurance", shortLabel: "health", templateId: "health-insurance.india.v1" },
  moving_home: { Icon: House, label: "Moving Home", shortLabel: "move", templateId: "moving-home.india.v1" },
  starting_a_business: { Icon: Store, label: "Starting a Business", shortLabel: "business", templateId: "business-setup.india.v1" },
  retirement: { Icon: Armchair, label: "Retirement", shortLabel: "retirement", templateId: "retirement.india.v1" },
} as const;

const choiceLabels = { yes: "Yes", not_sure: "Not sure", no: "No", both: "Both parents", mother: "My mother", father: "My father" } as const;

const factLabels: Record<string, string> = {
  "birth.city": "Birth city",
  "birth.state": "Birth state",
  "birth.setting": "Birth setting",
  "child.dateOfBirth": "Date of birth",
  "vehicle.purchaseType": "Purchase",
  "vehicle.city": "City",
  "vehicle.state": "Registered state",
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

function apiError(value: unknown) {
  if (typeof value === "object" && value !== null) {
    const message = "message" in value && typeof value.message === "string" ? value.message : null;
    const code = "code" in value && typeof value.code === "string" ? value.code : null;
    if (code === "AI_GATEWAY_NOT_CONFIGURED") return "The AI assistant is not available in this demo right now. Nothing was saved or added to My life.";
    if (message) return message;
  }
  return "AI could not analyse that request. Please try again.";
}

export default function IntakePage() {
  return <Suspense fallback={<main className="page workflow-state"><LoaderCircle className="service-spinner" /><p>Getting things ready…</p></main>}><IntakeFlow /></Suspense>;
}

function IntakeFlow() {
  const { state, dispatch, createJourney } = useJourney();
  const router = useRouter();
  const searchParams = useSearchParams();
  const experience = intakeExperience(searchParams.get("journey"));
  const analyseOnOpen = searchParams.get("analyse") === "1";
  const automaticStatement = analyseOnOpen ? state.statement.trim() : "";
  const initialAnalysis = automaticStatement.length >= 3
    ? { ...initialIntakeResolutionState, phase: "analysing" as const }
    : initialIntakeResolutionState;
  const [analysis, dispatchAnalysis] = useEffectReducer(intakeResolutionReducer, initialAnalysis);
  const [analysisRequest, setAnalysisRequest] = useState<{ statement: string; attempt: number } | null>(() => automaticStatement.length >= 3
    ? { statement: automaticStatement, attempt: 0 }
    : null);
  const [parentSelection, setParentSelection] = useState<"both" | "mother" | "father" | null>(null);

  useEffect(() => {
    if (!analysisRequest) return;
    const controller = new AbortController();
    const statement = analysisRequest.statement;
    void fetch("/api/intake/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statement, selectedLifeEvent: experience?.lifeEvent }),
      signal: controller.signal,
    }).then(async (response) => {
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(apiError(body));
      const parsed = intakeResultSchema.safeParse(body);
      if (!parsed.success) throw new Error("AI returned an invalid analysis. Nothing was saved. Please try again.");
      dispatchAnalysis({ type: "resolution_succeeded", resolution: parsed.data, statement });
    }).catch((caught) => {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      dispatchAnalysis({ type: "resolution_failed", message: caught instanceof Error ? caught.message : "AI could not analyse that request. Please try again." });
    });
    return () => controller.abort();
  }, [analysisRequest, dispatchAnalysis, experience?.lifeEvent]);

  const resolution = analysis.resolution;
  const meta = resolution ? journeyMeta[resolution.lifeEvent.value] : experience ? journeyMeta[experience.lifeEvent] : null;
  const asksForParents = resolution?.clarification.key === "health.subjects";
  const standardAnswer = resolution ? resolution.clarification.key === "health.currentCover" ? state.healthCoverageKnown
    : resolution.clarification.key === "vehicle.ownershipTransferred" ? state.vehicleOwnershipTransferred
      : resolution.clarification.key === "move.hasAddressEvidence" ? state.moveAddressEvidenceKnown
        : resolution.clarification.key === "business.hasPremisesProof" ? state.businessPremisesProofKnown
          : resolution.clarification.key === "retirement.hasAccountStatement" ? state.retirementStatementKnown
            : resolution.clarification.key === "birth.registeredByHospital" ? state.hospitalRegistered
              : null : null;
  const clarificationAnswer = asksForParents ? parentSelection : standardAnswer;

  function requestAnalysis(statement?: string) {
    const nextStatement = (statement ?? state.statement).trim();
    if (nextStatement.length < 3) return;
    if (nextStatement !== state.statement) dispatch({ type: "set_statement", value: nextStatement });
    setParentSelection(null);
    dispatchAnalysis({ type: "analysis_requested" });
    setAnalysisRequest((request) => ({ statement: nextStatement, attempt: (request?.attempt ?? 0) + 1 }));
  }

  function editDescription() {
    setParentSelection(null);
    setAnalysisRequest(null);
    dispatchAnalysis({ type: "edit_requested" });
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
    if (!resolution || !meta || !clarificationAnswer) return;
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
      dispatch({ type: "operation_failed", message: caught instanceof Error ? caught.message : "This could not be added to My life." });
    }
  }

  const HeadingIcon = meta?.Icon ?? Sparkles;
  const title = experience?.title ?? "What do you need help with?";
  const description = experience?.description ?? "Describe the event, and we’ll identify the relevant public services and the first detail we need.";
  const waitingForAutomaticAnalysis = Boolean(analysisRequest && analysis.phase === "idle");

  return <main className="page intake-page">
    <div className="subtle-scene" aria-hidden="true" />
    <div className="intake-layout content-layer">
      <section className="intake-content">
        <div className="intake-topline"><Link href="/" className="back-link"><ArrowLeft />Back</Link></div>
        <header className="screen-heading intake-heading">
          <p className="eyebrow"><HeadingIcon />{experience ? experience.label : "Tell us what changed"}</p>
          <h1>{analysis.phase === "ready" && meta ? `Check the ${meta.shortLabel} details` : title}</h1>
          <p>{analysis.phase === "ready" ? "We found these details in your description. Check them, then answer one question before this is added to My life." : description}</p>
        </header>

        {analysis.phase === "idle" && !waitingForAutomaticAnalysis ? <JourneyStarterComposer
          experience={experience}
          query={state.statement}
          setQuery={(value) => dispatch({ type: "set_statement", value })}
          start={requestAnalysis}
        /> : null}

        {analysis.phase === "analysing" || waitingForAutomaticAnalysis ? <section className="panel intake-analysis-progress" role="status" aria-live="polite" aria-label="AI analysis progress">
          <div className="analysis-progress-mark"><LoaderCircle className="service-spinner" /></div>
          <div><h2>Reading your description…</h2><p>Nothing is being added yet.</p></div>
          <ol aria-label="Analysis steps">
            <li className="active"><LoaderCircle />Read your description</li>
            <li><CircleHelp />Check the important details</li>
            <li><CircleHelp />Choose the next question</li>
          </ol>
        </section> : null}

        {analysis.phase === "error" ? <>
          <JourneyStarterComposer
            experience={experience}
            query={state.statement}
            setQuery={(value) => dispatch({ type: "set_statement", value })}
            start={requestAnalysis}
          />
          <div className="analysis-inline-error" role="alert"><CircleHelp /><div><strong>AI analysis did not finish</strong><p>{analysis.error}</p></div><button type="button" onClick={() => requestAnalysis()}><RefreshCw />Try again</button></div>
        </> : null}

        {analysis.phase === "ready" && resolution && meta ? <>
          <section className="panel intake-understanding" aria-labelledby="intake-understanding-title">
            <div className="intake-understanding-lead"><span><meta.Icon /></span><div><p>AI found</p><h2 id="intake-understanding-title">{resolution.facts.find((fact) => fact.key.endsWith("makeModel"))?.value ?? meta.label}</h2></div><CheckCircle2 /></div>
            {resolution.facts.length ? <dl>{resolution.facts.slice(0, 6).map((fact) => <div key={fact.key}><dt>{factLabels[fact.key] ?? readable(fact.key.split(".").at(-1) ?? fact.key)}</dt><dd>{readable(fact.value)}</dd></div>)}</dl> : <p className="no-assumptions"><ShieldCheck />No extra details were assumed.</p>}
            <button type="button" className="edit-description" onClick={editDescription}><Pencil />Change description</button>
          </section>

          <section className="panel intake-next-question" aria-labelledby="intake-question-title">
            <div className="question-title"><span><ShieldCheck /></span><div><p>One detail needed</p><h2 id="intake-question-title">{resolution.clarification.question}</h2><small>{asksForParents ? "Each parent will keep a separate record, evidence and eligibility check." : "Choose “Not sure” if you do not have the document with you."}</small></div></div>
            <div className="choice-row">
              {resolution.clarification.key === "health.subjects"
                ? resolution.clarification.choices.map((value) => <button type="button" className={parentSelection === value ? "selected" : ""} aria-pressed={parentSelection === value} onClick={() => setParentSelection(value)} key={value}><UserRound />{choiceLabels[value]}</button>)
                : resolution.clarification.choices.map((value) => {
                  const Icon = value === "yes" ? CheckCircle2 : CircleHelp;
                  return <button type="button" className={standardAnswer === value ? "selected" : ""} aria-pressed={standardAnswer === value} onClick={() => selectStandardChoice(value)} key={value}><Icon />{choiceLabels[value]}</button>;
                })}
            </div>
          </section>
          {state.error ? <p className="workflow-error" role="alert">{state.error}</p> : null}
          <div className="intake-create-action"><button type="button" className="primary-cta" disabled={!clarificationAnswer || state.pending} onClick={buildJourney}>{state.pending ? "Adding to My life…" : `Add ${meta.shortLabel} to My life`}{state.pending ? <LoaderCircle className="service-spinner" /> : <ArrowRight />}</button><small><Check />You will review every service step before anything is sent.</small></div>
        </> : null}
      </section>
    </div>
  </main>;
}
