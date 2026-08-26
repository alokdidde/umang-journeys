"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, ShieldCheck, UserRound } from "lucide-react";
import { useJourney } from "@/components/journey-provider";

function profileValues(facts: Record<string, string>) {
  return {
    name: facts["person.name"] ?? "Ananya Sharma",
    dateOfBirth: facts["person.dateOfBirth"] ?? "1992-04-18",
    state: facts["person.state"] ?? "Telangana",
    householdSize: facts["household.size"] ?? "3",
    currentCover: facts["health.currentCover"] ?? "not_sure",
    abhaStatus: facts["health.abhaStatus"] ?? "not_sure",
    coverageFor: facts["health.coverageFor"] ?? "self",
    careRoute: facts["health.careRoute"] ?? "not_sure",
    activeClaim: facts["health.activeClaim"] ?? "no",
  };
}

export default function HealthProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, loadJourney, completeHealthProfile } = useJourney();
  const isDependentJourney = state.facts["health.coverageFor"] === "dependent";
  const dependentRelationship = state.facts["health.dependentRelationship"];
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [values, setValues] = useState(() => profileValues(state.facts));
  const [valuesJourneyId, setValuesJourneyId] = useState(state.journeyId);

  if (state.journeyId === id && valuesJourneyId !== id) {
    setValuesJourneyId(id);
    setValues(profileValues(state.facts));
  }

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
      "health.coverageFor": values.coverageFor,
      "health.careRoute": values.careRoute,
      "health.activeClaim": values.activeClaim,
    });
    if (ok) window.setTimeout(() => router.push(`/journeys/${id}`), 120);
  }

  const field = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues((current) => ({ ...current, [key]: event.target.value })),
  });

  return <main className="page vehicle-details-page health-profile-page">
    <div className="service-shell">
      <Link href={`/journeys/${id}`} className="floating-back"><ArrowLeft />Back to journey</Link>
      <header className="vehicle-form-heading">
        <span><UserRound /></span><div><p className="eyebrow">Step 1 · Confirm the person</p><h1>Who is this health plan for?</h1><p>We only need enough information to organise this person’s cover and care-readiness steps. Do not enter medical records here.</p></div>
      </header>
      <div className="vehicle-form-layout">
        <form className="panel vehicle-details-form" onSubmit={submit}>
          <p className="form-step-label">Part {formStep} of 2</p>
          {formStep === 1 ? <section><h2>About the person</h2><p>Review the details for the person who needs health cover.</p>
            <label htmlFor="person-name">Full name</label><input id="person-name" autoComplete="name" required {...field("name")} />
            <label htmlFor="person-date-of-birth">Date of birth</label><input id="person-date-of-birth" type="date" required {...field("dateOfBirth")} />
            <label htmlFor="person-state">State</label><select id="person-state" {...field("state")}><option>Telangana</option><option>Andhra Pradesh</option><option>Delhi</option><option>Karnataka</option><option>Maharashtra</option></select>
            <label htmlFor="household-size">People in their household</label><input id="household-size" inputMode="numeric" min="1" max="20" type="number" required {...field("householdSize")} />
          </section> : <section><h2>Current cover</h2><p>It is fine if you are unsure. We will show verification steps instead of guessing.</p>
            <label htmlFor="current-cover">Does this person have a health policy or government scheme card?</label><select id="current-cover" {...field("currentCover")}><option value="yes">Yes</option><option value="not_sure">I’m not sure</option><option value="no">No</option></select>
            <label htmlFor="abha-status">Does this person already have an ABHA number?</label><select id="abha-status" {...field("abhaStatus")}><option value="yes">Yes</option><option value="not_sure">I’m not sure</option><option value="no">No</option></select>
            <details className="profile-exceptions"><summary>Add planned-care or claim details</summary><div>{isDependentJourney ? <p className="field-helper">This journey stays with your {dependentRelationship ?? "dependant"}. The other person has a separate record.</p> : <><label htmlFor="coverage-for">Who needs to be organised?</label><select id="coverage-for" {...field("coverageFor")}><option value="self">Only me</option><option value="family">Me and family members</option><option value="dependent">A dependant</option></select></>}<label htmlFor="care-route">Likely care or claim route</label><select id="care-route" {...field("careRoute")}><option value="not_sure">Not sure</option><option value="cashless">Planned cashless care</option><option value="reimbursement">Reimbursement after treatment</option><option value="preauthorisation">Pre-authorisation already requested</option></select><label htmlFor="active-claim">Is an insurer or hospital waiting for a reply?</label><select id="active-claim" {...field("activeClaim")}><option value="no">No</option><option value="not_sure">Not sure</option><option value="yes">Yes</option></select></div></details>
          </section>
          }
          {state.error ? <p className="workflow-error" role="alert">{state.error}</p> : null}
          <div className="profile-form-actions">
            {formStep === 2 ? <button className="secondary-button" type="button" onClick={() => setFormStep(1)}>Back</button> : null}
            {formStep === 1 ? <button className="primary-cta" type="button" onClick={(event) => { if (event.currentTarget.form?.reportValidity()) setFormStep(2); }}>Continue to cover details<ArrowRight /></button> : <button className="primary-cta" type="submit" disabled={state.pending}>{state.pending ? "Saving your profile…" : "Confirm and continue"}<ArrowRight /></button>}
          </div>
        </form>
        <details className="panel vehicle-form-assurance"><summary>What happens next</summary><div><ShieldCheck /><ul><li><ClipboardCheck />We’ll read a policy or scheme card.</li><li><CheckCircle2 />Potential public-scheme matches stay clearly unverified.</li><li><UserRound />You decide whether health records may be linked.</li></ul><p>No real insurer, scheme, ABHA account, hospital, or government service is contacted.</p></div></details>
      </div>
    </div>
  </main>;
}
