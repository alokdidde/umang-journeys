import Link from "next/link";
import { ArrowRight, CheckCircle2, HeartHandshake } from "lucide-react";
import { lifeItemKindLabel, type LifeItem } from "@/domain/life-item";
import { LifeEntityIcon } from "@/components/life-entity-icon";

export function LifeCard({ item }: { item: LifeItem }) {
  return <article className="life-card">
    <header><span className={`journey-avatar ${item.type}`}><LifeEntityIcon kind={item.entityKind} /></span><div><small>{lifeItemKindLabel(item)}</small><h3>{item.displayName}</h3><p>{item.needs.length ? `${item.needs.length} ${item.needs.length === 1 ? "service" : "services"} saved here` : item.unavailableNeeds.length ? "Saved · guided steps not available yet" : "Saved in My life"}</p></div>{item.completed ? <em><CheckCircle2 />All caught up</em> : <em>{item.actions.length} to do</em>}</header>
    {item.actions.length ? <div className="life-card-actions">{item.actions.slice(0, 2).map((action) => <Link href={action.href} key={`${action.journeyId}:${action.nodeKey}`}><span><HeartHandshake /></span><div><small>{action.needTitle}</small><strong>{action.title}</strong></div><ArrowRight /></Link>)}</div> : <p className="life-card-clear"><CheckCircle2 />Nothing required right now</p>}
    <footer><Link href={`/life/${encodeURIComponent(item.entityId)}`}>Open {item.displayName}<ArrowRight /></Link></footer>
  </article>;
}
