import Link from "next/link";
import { Armchair, ArrowRight, Baby, BriefcaseBusiness, Car, Check, Clock3, CreditCard, FileHeart, FileText, FolderClock, Gift, HeartPulse, House, IdCard, Landmark, MapPinned, Rocket, ScanLine, ShieldCheck, ShieldPlus, Syringe, UserRound } from "lucide-react";
import type { JourneySummary } from "@/domain/journey-summary";

export function JourneyCard({ journey }: { journey: JourneySummary }) {
  const action = journey.nextAction;
  return (
    <article className="home-journey-card panel">
      <header>
        <span className={`journey-avatar ${journey.subject.type}`}>
          {journey.subject.type === "vehicle" ? <Car /> : journey.subject.type === "person" ? <UserRound /> : journey.subject.type === "residence" ? <House /> : journey.subject.type === "business" ? <BriefcaseBusiness /> : <Baby />}
        </span>
        <div><p>{journey.title}</p><h3>{journey.subject.displayName}</h3></div>
      </header>
      <div className="home-progress-copy"><span>{journey.progress.completed} of {journey.progress.total} steps complete</span><strong>{journey.progress.percent}%</strong></div>
      <div className="home-progress-track" role="progressbar" aria-label={`${journey.subject.displayName} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={journey.progress.percent}><span style={{ width: `${journey.progress.percent}%` }} /></div>
      {action ? <div className="next-action-block">
        <span className={`next-action-icon ${action.status}`}><ActionIcon nodeKey={action.nodeKey} /></span>
        <div><small>Next step</small><h4>{action.title}</h4><p>{action.description}</p></div>
        <Link className="primary-cta" href={action.href}>{action.status === "available" ? "Start" : "Continue"}<ArrowRight /></Link>
      </div> : <div className="next-action-block complete"><span className="next-action-icon completed"><Check /></span><div><small>All caught up</small><h4>Nothing required right now</h4><p>Your records and future responsibilities remain available.</p></div><Link className="secondary-button" href={`/journeys/${journey.id}`}>Open {journey.subject.displayName}<ArrowRight /></Link></div>}
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
  if (nodeKey === "policy_owner_match") return <ScanLine />;
  if (nodeKey === "fastag_setup") return <CreditCard />;
  if (nodeKey === "compliance_calendar") return <Clock3 />;
  if (nodeKey === "vehicle_details") return <Car />;
  if (nodeKey === "health_profile") return <UserRound />;
  if (nodeKey === "coverage_review") return <ShieldPlus />;
  if (nodeKey === "public_scheme_check") return <Landmark />;
  if (nodeKey === "abha_records") return <FileHeart />;
  if (nodeKey === "cashless_readiness") return <HeartPulse />;
  if (nodeKey === "move_profile" || nodeKey === "residence_evidence" || nodeKey === "aadhaar_address" || nodeKey === "voter_address") return <MapPinned />;
  if (nodeKey === "move_completion_pack") return <House />;
  if (nodeKey === "business_profile" || nodeKey === "business_premises" || nodeKey === "udyam_readiness" || nodeKey === "gst_readiness") return <BriefcaseBusiness />;
  if (nodeKey === "business_launch_pack") return <Rocket />;
  if (nodeKey === "retirement_profile" || nodeKey === "pension_pathway" || nodeKey === "life_certificate_readiness") return <Armchair />;
  if (nodeKey === "retirement_record_review" || nodeKey === "retirement_pack") return <FolderClock />;
  return <Baby />;
}
