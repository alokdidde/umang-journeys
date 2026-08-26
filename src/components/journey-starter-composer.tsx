"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileSearch, FileText, LoaderCircle, Paperclip, ShieldCheck, X } from "lucide-react";
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
      start(statement || undefined);
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
    const context = statement || (experience ? `This document is for the ${experience.label} journey.` : "");
    if (context) form.set("context", context);
    if (experience) form.set("expectedKind", experience.sampleType);
    await analyseDocument(form);
  }

  async function handleSampleDocument() {
    if (!experience) return;
    const form = new FormData();
    form.set("sampleType", experience.sampleType);
    form.set("expectedKind", experience.sampleType);
    form.set("context", `This sample is for the ${experience.label} journey.`);
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

      if (!body.journeyId) throw new Error("The document was saved, but no journey was available to open.");
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

  return <div className={`journey-composer ${phase}`}>
    {phase === "idle" || phase === "error" ? <>
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
      {error ? <div className="journey-composer-error" role="alert"><X /><span>{error}</span></div> : null}
    </> : null}

    {phase === "analysing" || phase === "applying" ? <div className="journey-composer-working" role="status" aria-live="polite">
      <LoaderCircle />
      <div><strong>{phase === "analysing" ? "Reading your document…" : "Updating your journey…"}</strong><span>{phase === "analysing" ? "Checking supported facts and finding where they belong." : "Applying only the change you approved."}</span></div>
    </div> : null}

    {phase === "proposal" && document ? <DocumentSuggestion document={document} decide={decide} /> : null}
  </div>;
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
      <span><FileText />We need a clearer document before we can update a journey.</span>
      <button type="button" className="secondary-button" onClick={() => void decide(false)}>Try another document</button>
    </footer>}
  </section>;
}
