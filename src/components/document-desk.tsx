"use client";

import Link from "next/link";
import { useEffectReducer } from "use-effect-reducer";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  Check,
  FileSearch,
  FileText,
  Hospital,
  LoaderCircle,
  Paperclip,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Syringe,
  X,
} from "lucide-react";
import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Confirmation,
  ConfirmationAction,
  ConfirmationActions,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
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
import {
  documentDeskReducer,
  initialDocumentDeskState,
  type DocumentDeskRecord,
} from "@/domain/document-desk-reducer";

type ProposalResponse = { document: DocumentDeskRecord; message?: string };
type DecisionResponse = { status: "applied" | "rejected"; journeyId: string | null; message: string };

export function DocumentDesk({ onJourneyChanged }: { onJourneyChanged: () => Promise<void> }) {
  const [state, dispatch] = useEffectReducer(documentDeskReducer, initialDocumentDeskState);
  const busy = state.phase === "analysing" || state.phase === "applying";

  async function analyseForm(form: FormData) {
    dispatch({ type: "analysis_started" });
    try {
      const response = await fetch("/api/assistant/documents", { method: "POST", body: form });
      const body = await response.json() as ProposalResponse;
      if (!response.ok) throw new Error(body.message ?? "The document could not be analysed.");
      dispatch({ type: "proposal_received", document: body.document });
    } catch (error) {
      dispatch({ type: "failed", message: error instanceof Error ? error.message : "The document could not be analysed." });
    }
  }

  async function analyseUpload(message: PromptInputMessage) {
    const attachment = message.files[0];
    if (!attachment?.url) {
      dispatch({ type: "failed", message: "Attach one PDF, PNG, or JPEG document to continue." });
      return;
    }
    const blob = await fetch(attachment.url).then((response) => response.blob());
    const form = new FormData();
    form.set("file", new File([blob], attachment.filename ?? "document", { type: attachment.mediaType ?? blob.type }));
    await analyseForm(form);
  }

  async function analyseSample(sampleType: "vehicle_rc" | "vaccination_receipt" | "insurance_policy" | "health_insurance_policy" | "hospital_discharge_summary") {
    const form = new FormData();
    form.set("sampleType", sampleType);
    await analyseForm(form);
  }

  async function decide(approved: boolean) {
    if (!state.document) return;
    dispatch({ type: "application_started" });
    try {
      const response = await fetch(`/api/assistant/documents/${encodeURIComponent(state.document.id)}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved }),
      });
      const body = await response.json() as DecisionResponse & { message?: string };
      if (!response.ok) throw new Error(body.message ?? "The proposed update could not be applied.");
      if (approved) {
        await onJourneyChanged();
        dispatch({ type: "application_finished", journeyId: body.journeyId, message: body.message });
      } else {
        dispatch({ type: "dismissed", message: body.message });
      }
    } catch (error) {
      dispatch({ type: "failed", message: error instanceof Error ? error.message : "The proposed update could not be applied." });
    }
  }

  return (
    <section className={`document-desk content-layer ${state.phase}`} aria-labelledby="document-desk-heading">
      <div className="document-desk-intro">
        <span className="document-desk-mark"><Sparkles aria-hidden="true" /></span>
        <div>
          <p>UMANG document assistant</p>
          <h2 id="document-desk-heading">Drop a document. We’ll find where it belongs.</h2>
          <span>Review every suggested update before anything changes.</span>
        </div>
        <em><ShieldCheck aria-hidden="true" />Approval required</em>
      </div>

      {state.phase === "idle" ? <div className="document-desk-compose">
        <PromptInput accept="application/pdf,image/png,image/jpeg" maxFiles={1} maxFileSize={5 * 1024 * 1024} onSubmit={analyseUpload} onError={(error) => dispatch({ type: "failed", message: error.message })}>
          <PromptInputAttachments />
          <PromptInputBody>
            <PromptInputTextarea aria-label="Optional document context" placeholder="Attach an RC, policy, vaccination receipt, or hospital record…" />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger aria-label="Attach a document"><Paperclip /></PromptInputActionMenuTrigger>
                <PromptInputActionMenuContent><PromptInputActionAddAttachments label="Choose a document" /></PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <span>PDF, PNG or JPEG · up to 5 MB</span>
            </PromptInputTools>
            <PromptInputSubmit aria-label="Analyse document"><FileSearch />Analyse</PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>
        <div className="document-samples" aria-label="Sample documents">
          <span>Try a synthetic sample</span>
          <button type="button" onClick={() => void analyseSample("vehicle_rc")}><Car />Registration certificate</button>
          <button type="button" onClick={() => void analyseSample("vaccination_receipt")}><Syringe />Vaccination receipt</button>
          <button type="button" onClick={() => void analyseSample("insurance_policy")}><ShieldCheck />Insurance policy</button>
          <button type="button" onClick={() => void analyseSample("health_insurance_policy")}><ShieldCheck />Health policy</button>
          <button type="button" onClick={() => void analyseSample("hospital_discharge_summary")}><Hospital />Discharge summary</button>
        </div>
      </div> : null}

      {state.phase === "analysing" ? <DocumentProcessing mode="analyse" /> : null}
      {state.phase === "applying" ? <DocumentProcessing mode="apply" /> : null}

      {state.phase === "proposal" && state.document ? <ProposalReview document={state.document} decide={decide} /> : null}

      {state.phase === "success" ? <div className="document-result success" role="status" aria-live="polite">
        <span><BadgeCheck /></span>
        <div><p>Document handled</p><h3>{state.message}</h3><small>The document and resulting changes are recorded in this evaluation account.</small></div>
        <div>{state.journeyId ? <Link className="primary-cta" href={`/journeys/${state.journeyId}`}>Open updated journey<ArrowRight /></Link> : null}<button className="secondary-button" type="button" onClick={() => dispatch({ type: "reset" })}>Use another document</button></div>
      </div> : null}

      {state.phase === "error" ? <div className="document-result error" role="alert">
        <span><X /></span><div><p>We couldn’t finish that</p><h3>{state.error}</h3><small>No journey data was changed.</small></div>
        <button className="secondary-button" type="button" onClick={() => dispatch({ type: "reset" })}><RotateCw />Try another document</button>
      </div> : null}

      {busy ? <span className="sr-only" aria-live="polite">Working on your document…</span> : null}
    </section>
  );
}

function PromptInputAttachments() {
  const attachments = usePromptInputAttachments();
  if (!attachments.files.length) return null;
  return <PromptInputHeader><Attachments variant="inline">{attachments.files.map((file) => <Attachment data={file} key={file.id} onRemove={() => attachments.remove(file.id)}><AttachmentPreview /><AttachmentInfo showMediaType /><AttachmentRemove /></Attachment>)}</Attachments></PromptInputHeader>;
}

function DocumentProcessing({ mode }: { mode: "analyse" | "apply" }) {
  const steps = mode === "analyse"
    ? ["Reading the document", "Extracting supported facts", "Matching your journeys"]
    : ["Attaching verified evidence", "Running the approved tool", "Refreshing your next action"];
  return <div className="document-processing" role="status" aria-live="polite">
    <span className="processing-orbit"><LoaderCircle /></span>
    <div><p>{mode === "analyse" ? "Analysing securely" : "Applying your approval"}</p><h3>{mode === "analyse" ? "Finding the right journey…" : "Updating your journey…"}</h3></div>
    <ol>{steps.map((step, index) => <li className={index === 0 ? "active" : "queued"} key={step}><span>{index === 0 ? <LoaderCircle /> : index + 1}</span>{step}</li>)}</ol>
  </div>;
}

function ProposalReview({ document, decide }: { document: DocumentDeskRecord; decide: (approved: boolean) => Promise<void> }) {
  const proposal = document.proposal;
  const kindLabel = document.analysis.kind === "vehicle_rc"
    ? "Registration certificate"
    : document.analysis.kind === "vaccination_receipt"
      ? "Vaccination receipt"
      : document.analysis.kind === "insurance_policy"
        ? "Motor insurance policy"
        : document.analysis.kind === "health_insurance_policy"
          ? "Health insurance policy"
        : document.analysis.kind === "hospital_discharge_summary"
          ? "Hospital discharge summary"
          : "Unrecognised document";
  return <div className="document-proposal">
    <header>
      <span>{document.analysis.kind === "vaccination_receipt" ? <Syringe /> : document.analysis.kind === "hospital_discharge_summary" ? <Hospital /> : document.analysis.kind === "insurance_policy" || document.analysis.kind === "health_insurance_policy" ? <ShieldCheck /> : <FileText />}</span>
      <div><p>{kindLabel} · {Math.round(document.analysis.confidence * 100)}% confidence</p><h3>{proposal.title}</h3><small>{document.fileName} · {formatFileSize(document.size)}</small></div>
      <em><Check />Analysis complete</em>
    </header>
    <div className="document-proposal-body">
      <div><p>{proposal.description}</p><dl>{proposal.changes.map((change) => <div key={change.label}><dt>{change.label}</dt><dd>{change.value}</dd></div>)}</dl></div>
      <aside><ShieldCheck /><strong>You stay in control</strong><p>We’ll run only the named update and preserve the source document as evidence.</p></aside>
    </div>
    {proposal.canApply ? <Confirmation approval={{ id: document.id }} state="approval-requested" className="document-confirmation">
      <ConfirmationRequest>
        <ConfirmationTitle>Approve this update to your UMANG journeys?</ConfirmationTitle>
        <ConfirmationActions>
          <ConfirmationAction variant="outline" onClick={() => void decide(false)}>Don’t update</ConfirmationAction>
          <ConfirmationAction onClick={() => void decide(true)}>Approve update<ArrowRight /></ConfirmationAction>
        </ConfirmationActions>
      </ConfirmationRequest>
    </Confirmation> : <div className="document-needs-review"><ShieldCheck /><div><strong>We need a clearer match</strong><p>Upload a clearer copy or rename the file so we can identify the document. No update is available at this confidence.</p></div><button type="button" className="secondary-button" onClick={() => void decide(false)}>Dismiss</button></div>}
  </div>;
}

function formatFileSize(size: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(size / 1024) + " KB";
}
