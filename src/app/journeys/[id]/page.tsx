"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LifeEventPlan } from "@/components/life-event-plan";
import { useJourney } from "@/components/journey-provider";

export default function JourneyRevealPage() {
  const { state, loadJourney } = useJourney();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (id && state.journeyId !== id) void loadJourney(id);
  }, [id, loadJourney, state.journeyId]);

  if (state.journeyId !== id && !state.error) return <main className="page workflow-state"><p>Loading this plan…</p></main>;
  if (state.error && state.journeyId !== id) return <main className="page workflow-state"><h1>We couldn’t load this plan.</h1><p>{state.error}</p><Link href="/intake" className="primary-cta">Start again</Link></main>;
  return <LifeEventPlan id={id} />;
}
