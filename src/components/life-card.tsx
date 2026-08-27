import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, HeartHandshake } from "lucide-react";
import { lifeItemKindLabel, type LifeItem } from "@/domain/life-item";
import { LifeEntityIcon } from "@/components/life-entity-icon";

export function LifeCard({ item }: { item: LifeItem }) {
  return <article className="life-card">
    <header><span className={`journey-avatar ${item.type}`}><LifeEntityIcon kind={item.entityKind} /></span><div><small>{lifeItemKindLabel(item)}</small><h3>{item.displayName}</h3><p>{savedSummary(item)}</p></div>{item.state === "caught_up" ? <em><CheckCircle2 />All caught up</em> : item.state === "guidance_unavailable" ? <em className="guidance-unavailable"><CircleAlert />No guided steps yet</em> : <em>{item.actions.length ? `${item.actions.length} to do` : "Needs attention"}</em>}</header>
    {item.actions.length ? <div className="life-card-actions">{item.actions.slice(0, 2).map((action) => <Link href={action.href} key={`${action.journeyId}:${action.nodeKey}`}><span><HeartHandshake /></span><div><small>{action.needTitle}</small><strong>{action.title}</strong></div><ArrowRight /></Link>)}</div> : null}
    <footer><Link href={`/life/${encodeURIComponent(item.entityId)}`}>Open {item.displayName}<ArrowRight /></Link></footer>
  </article>;
}

function savedSummary(item: LifeItem) {
  const guided = item.needs.length ? `${item.needs.length} guided ${item.needs.length === 1 ? "service" : "services"}` : "";
  const unavailable = item.unavailableNeeds.length ? `${item.unavailableNeeds.length} saved ${item.unavailableNeeds.length === 1 ? "request" : "requests"}` : "";
  return [guided, unavailable].filter(Boolean).join(" · ") || "Record saved";
}
