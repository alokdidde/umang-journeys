import Link from "next/link";
import { ArrowRight, Baby, Car, Check, Clock3, CreditCard, FileText, Gift, HeartPulse, IdCard, ShieldCheck, Syringe } from "lucide-react";
import type { JourneySummary } from "@/domain/journey-summary";

export function JourneyCard({ journey }: { journey: JourneySummary }) {
  const action = journey.nextAction;
  return (
    <article className="home-journey-card panel">
      <header>
        <span className={`journey-avatar ${journey.subject.type}`}>
          {journey.subject.type === "vehicle" ? <Car /> : <Baby />}
        </span>
        <div><p>{journey.title}</p><h3>{journey.subject.displayName}</h3><span><Clock3 />Updated {formatUpdatedAt(journey.updatedAt)}</span></div>
        <em className={`status ${journey.status === "completed" ? "completed" : "in_progress"}`}>{journey.status === "completed" ? "Journey complete" : "Active journey"}</em>
      </header>
      <div className="home-progress-copy"><span>{journey.progress.completed} of {journey.progress.total} services complete</span><strong>{journey.progress.percent}%</strong></div>
      <div className="home-progress-track" role="progressbar" aria-label={`${journey.subject.displayName} journey progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={journey.progress.percent}><span style={{ width: `${journey.progress.percent}%` }} /></div>
      {action ? <div className="next-action-block">
        <span className={`next-action-icon ${action.status}`}><ActionIcon nodeKey={action.nodeKey} /></span>
        <div><small>Next for {journey.subject.displayName}</small><h4>{action.title}</h4><p>{action.description}</p><span className="action-timing"><Clock3 />{action.timingLabel}</span><em className={`status ${action.status}`}>{action.stateLabel}</em></div>
        <Link className="primary-cta" href={action.href}>{action.status === "available" ? "Start next step" : "Continue"}<ArrowRight /></Link>
      </div> : <div className="next-action-block complete"><span className="next-action-icon completed"><Check /></span><div><small>All caught up</small><h4>This journey is complete</h4><p>Your records remain available whenever you need them.</p></div><Link className="secondary-button" href={`/journeys/${journey.id}`}>View journey<ArrowRight /></Link></div>}
    </article>
  );
}

function ActionIcon({ nodeKey }: { nodeKey: string }) {
  if (nodeKey === "birth_certificate" || nodeKey === "ownership_transfer") return <FileText />;
  if (nodeKey === "child_health_record") return <HeartPulse />;
  if (nodeKey === "vaccination_timeline") return <Syringe />;
  if (nodeKey === "child_identity") return <IdCard />;
  if (nodeKey === "eligible_benefits") return <Gift />;
  if (nodeKey === "insurance_cover") return <ShieldCheck />;
  if (nodeKey === "fastag_setup") return <CreditCard />;
  if (nodeKey === "compliance_calendar") return <Clock3 />;
  if (nodeKey === "vehicle_details") return <Car />;
  return <Baby />;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "recently";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(date);
}
