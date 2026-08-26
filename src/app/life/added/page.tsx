import { Suspense } from "react";
import { LifeRequestAdded } from "@/components/life-request-added";

export default function LifeRequestAddedPage() {
  return <Suspense fallback={<main className="page workflow-state"><p>Loading what was added…</p></main>}><LifeRequestAdded /></Suspense>;
}
