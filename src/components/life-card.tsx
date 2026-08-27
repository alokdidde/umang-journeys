import Link from "next/link";
import { ArrowRight, Baby, BriefcaseBusiness, Car, CheckCircle2, HeartHandshake, Home, UserRound } from "lucide-react";
import { lifeItemKindLabel, type LifeItem } from "@/domain/life-item";

function SubjectIcon({ type }: { type: LifeItem["type"] }) {
  if (type === "child") return <Baby />;
  if (type === "vehicle") return <Car />;
  if (type === "residence") return <Home />;
  if (type === "business") return <BriefcaseBusiness />;
  return <UserRound />;
}

export function LifeCard({ item }: { item: LifeItem }) {
  return <article className="life-card">
    <header><span className={`journey-avatar ${item.type}`}><SubjectIcon type={item.type} /></span><div><small>{lifeItemKindLabel(item)}</small><h3>{item.displayName}</h3><p>{item.needs.length} {item.needs.length === 1 ? "service" : "services"} saved here</p></div>{item.completed ? <em><CheckCircle2 />All caught up</em> : <em>{item.actions.length} to do</em>}</header>
    {item.actions.length ? <div className="life-card-actions">{item.actions.slice(0, 2).map((action) => <Link href={action.href} key={`${action.journeyId}:${action.nodeKey}`}><span><HeartHandshake /></span><div><small>{action.needTitle}</small><strong>{action.title}</strong></div><ArrowRight /></Link>)}</div> : <p className="life-card-clear"><CheckCircle2 />Nothing required right now</p>}
    <footer><Link href={`/life/${encodeURIComponent(item.entityId)}`}>Open {item.displayName}<ArrowRight /></Link></footer>
  </article>;
}
