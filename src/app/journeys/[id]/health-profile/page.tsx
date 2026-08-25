"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, ShieldCheck, UserRound } from "lucide-react";
import { useJourney } from "@/components/journey-provider";

export default function HealthProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, loadJourney, completeHealthProfile } = useJourney();
  const [values, setValues] = useState(() => ({
    name: state.facts["person.name"] ?? "Ananya Sharma",
    dateOfBirth: state.facts["person.dateOfBirth"] ?? "1992-04-18",
    state: state.facts["person.state"] ?? "Telangana",
    householdSize: state.facts["household.size"] ?? "3",
    currentCover: state.facts["health.currentCover"] ?? "yes",
    abhaStatus: state.facts["health.abhaStatus"] ?? "not_sure",
  }));

  useEffect(() => { if (id && state.journeyId !== id) void loadJourney(id); }, [id, loadJourney, state.journeyId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await completeHealthProfile(id, {
      "person.name": values.name,
      "person.dateOfBirth": values.dateOfBirth,
      "person.state": values.state,
      "household.size": values.householdSize,
      "health.currentCover": values.currentCover,
      "health.abhaStatus": values.abhaStatus,
    });
    if (ok) router.push(`/journeys/${id}`);
  }

  const field = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues((current) => ({ ...current, [key]: event.target.value })),
  });

  return <main className="page vehicle-details-page health-profile-page">
    <div className="service-shell">
      <Link href={`/journeys/${id}`} className="floating-back"><ArrowLeft />Back to journey</Link>
      <header className="vehicle-form-heading">
        <span><UserRound /></span><div><p className="eyebrow">Step 1 · Confirm the person</p><h1>Who is this health plan for?</h1><p>We only need enough information to organise your cover and care-readiness steps. Do not enter medical records here.</p></div>
      </header>
      <div className="vehicle-form-layout">
        <form className="panel vehicle-details-form" onSubmit={submit}>
          <section><h2>About you</h2><p>Review the details used to match this evaluation journey.</p>
            <label htmlFor="person-name">Full name</label><input id="person-name" autoComplete="name" required {...field("name")} />
            <label htmlFor="person-date-of-birth">Date of birth</label><input id="person-date-of-birth" type="date" required {...field("dateOfBirth")} />
            <label htmlFor="person-state">State</label><select id="person-state" {...field("state")}><option>Telangana</option><option>Andhra Pradesh</option><option>Delhi</option><option>Karnataka</option><option>Maharashtra</option></select>
            <label htmlFor="household-size">People in your household</label><input id="household-size" inputMode="numeric" min="1" max="20" type="number" required {...field("householdSize")} />
          </section>
          <section><h2>What you already have</h2><p>It is fine if you are unsure. We will show verification steps instead of guessing.</p>
            <label htmlFor="current-cover">Do you have a health policy or government scheme card?</label><select id="current-cover" {...field("currentCover")}><option value="yes">Yes</option><option value="not_sure">I’m not sure</option><option value="no">No</option></select>
            <label htmlFor="abha-status">Do you already have an ABHA number?</label><select id="abha-status" {...field("abhaStatus")}><option value="yes">Yes</option><option value="not_sure">I’m not sure</option><option value="no">No</option></select>
          </section>
          {state.error ? <p className="workflow-error" role="alert">{state.error}</p> : null}
          <button className="primary-cta" type="submit" disabled={state.pending}>{state.pending ? "Saving your profile…" : "Confirm and continue"}<ArrowRight /></button>
        </form>
        <aside className="panel vehicle-form-assurance"><ShieldCheck /><h2>What happens next</h2><ul><li><ClipboardCheck />We’ll read a policy or scheme card.</li><li><CheckCircle2 />Potential public-scheme matches stay clearly unverified.</li><li><UserRound />You decide whether health records may be linked.</li></ul><p>No real insurer, scheme, ABHA account, hospital, or government service is contacted.</p></aside>
      </div>
    </div>
  </main>;
}
