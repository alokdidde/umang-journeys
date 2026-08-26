"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Baby, BriefcaseBusiness, Car, Check, CheckCircle2, FileSearch, FileText, Home, LoaderCircle, Paperclip, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import type { DocumentDeskRecord } from "@/domain/document-desk-reducer";
import type { IntakeExperience } from "@/domain/intake-experience";
import type { LifeRequestPlan } from "@/domain/life-request";
import { initialLifeRequestState, lifeRequestReducer } from "@/domain/life-request-reducer";
import { Confirmation, ConfirmationAction, ConfirmationActions, ConfirmationRequest, ConfirmationTitle } from "@/components/ai-elements/confirmation";

type ComposerPhase = "idle" | "analysing" | "proposal" | "applying" | "error";
type ProposalResponse = { document: DocumentDeskRecord; message?: string };
type DecisionResponse = { journeyId: string | null; message: string };

export function JourneyStarterComposer({
  query,
  setQuery,
  start,
  experience,
}: {
  query: string;
  setQuery: (value: string) => void;
  start: (statement?: string) => void;
  experience?: IntakeExperience | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<ComposerPhase>("idle");
  const [requestState, dispatchRequest] = useReducer(lifeRequestReducer, initialLifeRequestState);
  const [document, setDocument] = useState<DocumentDeskRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyseDocument(form: FormData) {
    setPhase("analysing");
    setError(null);
    try {
      const response = await fetch("/api/assistant/documents", { method: "POST", body: form });
      const body = await response.json() as ProposalResponse;
      if (!response.ok) throw new Error(body.message ?? "The document could not be read.");
      setDocument(body.document);
      setPhase("proposal");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The document could not be read.");
      setPhase("error");
      throw caught;
    }
  }

  async function submit(message: PromptInputMessage) {
    const statement = message.text.trim();
    const attachment = message.files[0];
    setQuery(statement);

    if (!attachment) {
      if (!statement) return;
      if (experience) {
        start(statement);
        return;
      }
      dispatchRequest({ type: "analyse" });
      try {
        const response = await fetch("/api/life/plan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ statement }),
        });
        const body = await response.json() as { plan?: LifeRequestPlan; message?: string };
        if (!response.ok || !body.plan) throw new Error(body.message ?? "We could not organise that request.");
        dispatchRequest({ type: "planned", plan: body.plan });
      } catch (caught) {
        dispatchRequest({ type: "fail", message: caught instanceof Error ? caught.message : "We could not organise that request." });
      }
      return;
    }

    if (!attachment.url) {
      setPhase("error");
      setError("Choose a PDF, PNG, or JPEG document to continue.");
      return;
    }

    const blob = await fetch(attachment.url).then((response) => response.blob());
    const form = new FormData();
    form.set("file", new File([blob], attachment.filename ?? "document", { type: attachment.mediaType ?? blob.type }));
    const context = statement || (experience ? `This document is for ${experience.label.toLowerCase()}.` : "");
    if (context) form.set("context", context);
    if (experience) form.set("expectedKind", experience.sampleType);
    await analyseDocument(form);
  }

  async function applyPlan() {
    if (!requestState.plan) return;
    dispatchRequest({ type: "apply" });
    try {
      const response = await fetch("/api/life/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: requestState.plan, answers: requestState.answers }),
      });
      const body = await response.json() as { subjectEntityId?: string | null; journeyIds?: string[]; message?: string };
      if (!response.ok) throw new Error(body.message ?? "The update could not be added.");
      if (body.subjectEntityId) router.push(`/life/${encodeURIComponent(body.subjectEntityId)}`);
      else if (body.journeyIds?.[0]) router.push(`/journeys/${encodeURIComponent(body.journeyIds[0])}`);
      else throw new Error("The update was saved, but there is nothing to open.");
    } catch (caught) {
      dispatchRequest({ type: "fail", message: caught instanceof Error ? caught.message : "The update could not be added." });
    }
  }

  async function handleSampleDocument() {
    if (!experience) return;
    const form = new FormData();
    form.set("sampleType", experience.sampleType);
    form.set("expectedKind", experience.sampleType);
    form.set("context", `This sample is for ${experience.label.toLowerCase()}.`);
    try {
      await analyseDocument(form);
    } catch {
      // analyseDocument keeps the visible error and restores an actionable state.
    }
  }

  async function decide(approved: boolean) {
    if (!document) return;
    setPhase("applying");
    setError(null);
    try {
      const response = await fetch(`/api/assistant/documents/${encodeURIComponent(document.id)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      const body = await response.json() as DecisionResponse & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "The proposed update could not be applied.");

      if (!approved) {
        setDocument(null);
        setPhase("idle");
        return;
      }

      if (!body.journeyId) throw new Error("The document was saved, but no matching person or thing was available to open.");
      if (query.trim()) {
        await fetch(`/api/journeys/${encodeURIComponent(body.journeyId)}/facts`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ facts: { "intake.statement": query.trim(), "intake.source": "document_and_statement" } }),
        });
      }
      router.push(`/journeys/${body.journeyId}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The proposed update could not be applied.");
      setPhase("error");
    }
  }

  const requestIsIdle = requestState.phase === "idle" || requestState.phase === "error";
  return <div className={`journey-composer ${requestState.phase !== "idle" ? requestState.phase : phase}`}>
    {(phase === "idle" || phase === "error") && requestIsIdle ? <>
      <PromptInput
        accept="application/pdf,image/png,image/jpeg"
        className="journey-composer-form"
        maxFiles={1}
        maxFileSize={5 * 1024 * 1024}
        onError={(inputError) => { setError(inputError.message); setPhase("error"); }}
        onSubmit={submit}
      >
        <ComposerAttachments />
        <PromptInputBody>
          <PromptInputTextarea
            aria-label={experience?.promptLabel ?? "Tell us what happened"}
            maxLength={300}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={experience?.placeholder ?? "I had a baby, we moved home, I bought a vehicle…"}
            value={query}
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger aria-label="Attach a document"><Paperclip /></PromptInputActionMenuTrigger>
              <PromptInputActionMenuContent><PromptInputActionAddAttachments label="Choose a document" /></PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <span>{experience?.documentLabel ?? "Attach a document, if you have one"}</span>
          </PromptInputTools>
          <PromptInputSubmit aria-label={experience ? "Use this description" : "Show my steps"} className="journey-composer-submit">{experience ? "Use this description" : "Show my steps"}<ArrowRight /></PromptInputSubmit>
        </PromptInputFooter>
      </PromptInput>
      <div className="journey-composer-after">
        <p className="journey-composer-note">You can type, attach a PDF or photo, or do both. We’ll ask before updating anything.</p>
        {experience ? <button type="button" className="sample-document-link" onClick={() => void handleSampleDocument()}>{experience.sampleLabel}</button> : null}
      </div>
      {error || requestState.error ? <div className="journey-composer-error" role="alert"><X /><span>{error ?? requestState.error}</span></div> : null}
    </> : null}

    {phase === "analysing" || phase === "applying" || requestState.phase === "analysing" || requestState.phase === "applying" ? <div className="journey-composer-working" role="status" aria-live="polite">
      <LoaderCircle />
      <div><strong>{requestState.phase === "analysing" ? "Organising what you need…" : phase === "analysing" ? "Reading your document…" : "Updating My life…"}</strong><span>{requestState.phase === "analysing" ? "Finding the people, things and services in your request." : phase === "analysing" ? "Checking supported facts and finding where they belong." : "Applying only the change you approved."}</span></div>
    </div> : null}

    {phase === "proposal" && document ? <DocumentSuggestion document={document} decide={decide} /> : null}
    {requestState.phase === "details" && requestState.plan ? <LifeRequestDetails plan={requestState.plan} answers={requestState.answers} answer={(id, value) => dispatchRequest({ type: "answer", id, value })} review={() => dispatchRequest({ type: "review" })} /> : null}
    {requestState.phase === "proposal" && requestState.plan ? <LifeRequestProposal plan={requestState.plan} answers={requestState.answers} edit={() => dispatchRequest({ type: "edit" })} apply={applyPlan} /> : null}
  </div>;
}

function LifeRequestDetails({ plan, answers, answer, review }: { plan: LifeRequestPlan; answers: Record<string, string>; answer: (id: string, value: string) => void; review: () => void }) {
  const complete = plan.questions.every((question) => !question.required || answers[question.id]?.trim());
  return <section className="life-request-panel" aria-labelledby="life-request-details-title">
    <header className="life-request-heading"><span><Sparkles /></span><div><p>Here’s what I understood</p><h2 id="life-request-details-title">{plan.summary}</h2></div></header>
    <LifeRequestMap plan={plan} />
    <div className="life-request-fields">
      <p>A couple of details will help me prepare this properly.</p>
      {plan.questions.map((question) => <label key={question.id}><span>{question.label}</span>{question.input === "choice" ? <select value={answers[question.id] ?? ""} onChange={(event) => answer(question.id, event.target.value)}><option value="">Choose one</option>{question.choices?.map((choice) => <option value={choice.value} key={choice.value}>{choice.label}</option>)}</select> : <input type={question.input} value={answers[question.id] ?? ""} onChange={(event) => answer(question.id, event.target.value)} />}</label>)}
    </div>
    <footer><span><ShieldCheck />Nothing has been added yet.</span><button type="button" className="life-search-submit" disabled={!complete} onClick={review}>Review what will be added<ArrowRight /></button></footer>
  </section>;
}

function LifeRequestMap({ plan }: { plan: LifeRequestPlan }) {
  return <div className="life-request-map">{plan.subjects.map((subject) => <div className="life-request-subject" key={subject.ref}><div className="life-request-person"><span><LifeSubjectIcon type={subject.type} /></span><div><small>{subject.relationship || subject.type}</small><strong>{subject.displayName}</strong></div></div><div className="life-request-needs">{plan.needs.filter((need) => need.subjectRef === subject.ref).map((need) => <div key={need.id}><Check /><span><strong>{need.label}</strong><small>{need.description}</small></span></div>)}</div></div>)}</div>;
}

function LifeSubjectIcon({ type }: { type: LifeRequestPlan["subjects"][number]["type"] }) {
  if (type === "child") return <Baby />;
  if (type === "vehicle") return <Car />;
  if (type === "residence") return <Home />;
  if (type === "business") return <BriefcaseBusiness />;
  return <UserRound />;
}

function LifeRequestProposal({ plan, answers, edit, apply }: { plan: LifeRequestPlan; answers: Record<string, string>; edit: () => void; apply: () => Promise<void> }) {
  const namedPlan = { ...plan, subjects: plan.subjects.map((subject) => {
    const nameQuestion = plan.questions.find((question) => question.subjectRef === subject.ref && ["child.name", "person.name", "business.name", "vehicle.makeModel", "move.label"].includes(question.factKey));
    return { ...subject, displayName: nameQuestion ? answers[nameQuestion.id]?.trim() || subject.displayName : subject.displayName };
  }) };
  const peopleOnly = plan.subjects.every((subject) => subject.type === "person" || subject.type === "child");
  const subjectLabel = plan.subjects.length === 1 ? (peopleOnly ? "person" : plan.subjects[0]!.type) : peopleOnly ? "people" : "people and things";
  const approvalTarget = plan.subjects.length === 1 ? `this ${subjectLabel}` : `these ${subjectLabel}`;
  return <Confirmation className="life-request-panel life-request-confirmation" approval={{ id: plan.requestId }} state="approval-requested">
    <ConfirmationRequest>
      <header className="life-request-heading"><span><Sparkles /></span><div><p>Ready for your approval</p><h2>{plan.subjects.length === 1 ? "One" : plan.subjects.length} {subjectLabel}, {plan.needs.length} {plan.needs.length === 1 ? "thing" : "things"} organised</h2></div></header>
      <LifeRequestMap plan={namedPlan} />
      <ConfirmationTitle><ShieldCheck />I’ll add {approvalTarget} and prepare these services. Nothing will be submitted to a department.</ConfirmationTitle>
      <ConfirmationActions><ConfirmationAction variant="outline" onClick={edit}><ArrowLeft />Change details</ConfirmationAction><ConfirmationAction onClick={() => void apply()}>Add to My life<ArrowRight /></ConfirmationAction></ConfirmationActions>
    </ConfirmationRequest>
  </Confirmation>;
}

function ComposerAttachments() {
  const attachments = usePromptInputAttachments();
  if (!attachments.files.length) return null;
  return <PromptInputHeader><Attachments variant="inline">{attachments.files.map((file) => <Attachment data={file} key={file.id} onRemove={() => attachments.remove(file.id)}><AttachmentPreview /><AttachmentInfo showMediaType /><AttachmentRemove /></Attachment>)}</Attachments></PromptInputHeader>;
}

function DocumentSuggestion({ document, decide }: { document: DocumentDeskRecord; decide: (approved: boolean) => Promise<void> }) {
  const { proposal } = document;
  return <section className="journey-document-suggestion" aria-labelledby="document-suggestion-heading">
    <header>
      <span><FileSearch /></span>
      <div><p>Document read · {Math.round(document.analysis.confidence * 100)}% confidence</p><h2 id="document-suggestion-heading">{proposal.title}</h2><small>{document.fileName}</small></div>
      <CheckCircle2 />
    </header>
    <div className="journey-document-suggestion-body">
      <p>{proposal.description}</p>
      {proposal.changes.length ? <dl>{proposal.changes.map((change) => <div key={change.label}><dt>{change.label}</dt><dd>{change.value}</dd></div>)}</dl> : null}
    </div>
    {proposal.canApply ? <footer>
      <span><ShieldCheck />Nothing changes until you approve.</span>
      <div><button type="button" className="secondary-button" onClick={() => void decide(false)}>Don’t use this</button><button type="button" className="life-search-submit" onClick={() => void decide(true)}>Approve and show my steps<ArrowRight /></button></div>
    </footer> : <footer className="needs-review">
      <span><FileText />We need a clearer document before we can update anything.</span>
      <button type="button" className="secondary-button" onClick={() => void decide(false)}>Try another document</button>
    </footer>}
  </section>;
}
