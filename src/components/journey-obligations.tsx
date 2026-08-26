import { AlertCircle, CalendarClock, CheckCircle2, ExternalLink } from "lucide-react";
import { deriveJourneyObligations } from "@/domain/journey-obligations";
import type { JourneyProjection } from "@/domain/journey-engine";

function dateLabel(value: string | null) {
  if (!value) return "Date not known yet";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

export function JourneyObligations({ projection, facts }: { projection: JourneyProjection; facts: Record<string, string> }) {
  const obligations = deriveJourneyObligations({ projection, facts });
  const open = obligations.filter((item) => item.status !== "completed");
  if (!open.length) return null;
  const urgent = open.filter((item) => item.status === "overdue" || item.status === "due");

  return <details className="journey-obligations content-layer">
    <summary><span><CalendarClock aria-hidden="true" /><strong>{urgent.length ? `${urgent.length} ${urgent.length === 1 ? "date needs" : "dates need"} attention` : "Upcoming dates and duties"}</strong></span><small>{open.length} tracked</small></summary>
    <div className="journey-obligation-list">
      {open.map((item) => <article key={item.id} className={`journey-obligation ${item.status}`}>
        <span>{item.status === "overdue" || item.status === "due" ? <AlertCircle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}</span>
        <div><strong>{item.title}</strong><p>{item.description}</p><small>{item.basis}</small></div>
        <div className="journey-obligation-date"><b>{item.status === "overdue" ? "Overdue" : item.status === "due" ? "Due soon" : item.status === "unscheduled" ? "Not scheduled" : "Upcoming"}</b><time dateTime={item.dueOn ?? undefined}>{dateLabel(item.dueOn)}</time>{item.source ? <a href={item.source.href} target="_blank" rel="noreferrer">Official source<ExternalLink aria-hidden="true" /></a> : null}</div>
      </article>)}
    </div>
  </details>;
}
