import Link from "next/link";
import { ArrowRight, Baby, Car, Check, Clock3, CreditCard, FileHeart, FileText, Gift, HeartPulse, IdCard, Landmark, ShieldCheck, ShieldPlus, Syringe, UserRound } from "lucide-react";
import type { JourneySummary } from "@/domain/journey-summary";

export function JourneyCard({ journey }: { journey: JourneySummary }) {
  const action = journey.nextAction;
  return (
    <article className="home-journey-card panel">
      <header>
        <span className={`journey-avatar ${journey.subject.type}`}>
          {journey.subject.type === "vehicle" ? <Car /> : journey.subject.type === "person" ? <UserRound /> : <Baby />}
        </span>
        <div><p>{journey.title}</p><h3>{journey.subject.displayName}</h3></div>
      </header>
      <div className="home-progress-copy"><span>{journey.progress.completed} of {journey.progress.total} steps complete</span><strong>{journey.progress.percent}%</strong></div>
      <div className="home-progress-track" role="progressbar" aria-label={`${journey.subject.displayName} journey progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={journey.progress.percent}><span style={{ width: `${journey.progress.percent}%` }} /></div>
      {action ? <div className="next-action-block">
        <span className={`next-action-icon ${action.status}`}><ActionIcon nodeKey={action.nodeKey} /></span>
        <div><small>Next step</small><h4>{action.title}</h4><p>{action.description}</p></div>
        <Link className="primary-cta" href={action.href}>{action.status === "available" ? "Start" : "Continue"}<ArrowRight /></Link>
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
  if (nodeKey === "health_profile") return <UserRound />;
  if (nodeKey === "coverage_review") return <ShieldPlus />;
  if (nodeKey === "public_scheme_check") return <Landmark />;
  if (nodeKey === "abha_records") return <FileHeart />;
  if (nodeKey === "cashless_readiness") return <HeartPulse />;
  return <Baby />;
}
