"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Car, CheckCircle2, FileCheck2, ShieldCheck } from "lucide-react";
import { useJourney } from "@/components/journey-provider";

export default function VehicleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, loadJourney, completeVehicleDetails } = useJourney();
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [values, setValues] = useState(() => ({
    registrationNumber: state.facts["vehicle.registrationNumber"] ?? "TS09EV4321",
    makeModel: state.facts["vehicle.makeModel"] ?? "Tata Nexon EV",
    purchaseDate: state.facts["vehicle.purchaseDate"] ?? "2026-08-25",
    sellerName: state.facts["vehicle.sellerName"] ?? "Vikram Rao",
    chassisLast5: state.facts["vehicle.chassisLast5"] ?? "7K2P9",
    transferScope: state.facts["vehicle.transferScope"] ?? "same_state",
  }));

  useEffect(() => { if (id && state.journeyId !== id) void loadJourney(id); }, [id, loadJourney, state.journeyId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await completeVehicleDetails(id, {
      "vehicle.registrationNumber": values.registrationNumber.replaceAll(" ", "").toUpperCase(),
      "vehicle.makeModel": values.makeModel,
      "vehicle.purchaseDate": values.purchaseDate,
      "vehicle.sellerName": values.sellerName,
      "vehicle.chassisLast5": values.chassisLast5.toUpperCase(),
      "vehicle.transferScope": values.transferScope,
    });
    // Let the submit interaction settle before replacing the route. This keeps
    // keyboard/pointer activation reliable while the provider publishes the
    // completed step state.
    if (ok) window.setTimeout(() => router.push(`/journeys/${id}`), 120);
  }

  const field = (key: keyof typeof values) => ({
    value: values[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setValues((current) => ({ ...current, [key]: event.target.value })),
  });

  return <main className="page vehicle-details-page">
    <div className="service-shell">
      <Link href={`/journeys/${id}`} className="floating-back"><ArrowLeft />Back to journey</Link>
      <header className="vehicle-form-heading">
        <span><Car /></span><div><p className="eyebrow">Step 1 · Confirm the subject</p><h1>Which vehicle did you buy?</h1><p>These details become the trusted anchor for every later check. Review them before we prepare any application.</p></div>
      </header>
      <div className="vehicle-form-layout">
        <form className="panel vehicle-details-form" onSubmit={submit}>
          <p className="form-step-label">Part {formStep} of 2</p>
          {formStep === 1 ? <section><h2>Vehicle identity</h2><p>Use the values printed on the registration certificate.</p>
            <label htmlFor="registration-number">Registration number</label><span className="field-helper">No spaces, for example TS09EV4321</span><input id="registration-number" required pattern="[A-Za-z]{2}[0-9]{2}[A-Za-z0-9]{1,3}[0-9]{4}" {...field("registrationNumber")} />
            <label htmlFor="make-model">Make and model</label><input id="make-model" required {...field("makeModel")} />
            <label htmlFor="chassis-suffix">Last 5 characters of chassis number</label><span className="field-helper">Only the suffix is stored in this evaluation.</span><input id="chassis-suffix" required minLength={5} maxLength={5} {...field("chassisLast5")} />
          </section> : <section><h2>Purchase details</h2><p>This determines the applicable ownership-transfer route and timing.</p>
            <label htmlFor="purchase-date">Purchase date</label><input id="purchase-date" type="date" required {...field("purchaseDate")} />
            <label htmlFor="seller-name">Seller’s name</label><input id="seller-name" required {...field("sellerName")} />
            <label htmlFor="transfer-scope">Where was the vehicle registered?</label><select id="transfer-scope" {...field("transferScope")}><option value="same_state">Same state as my address</option><option value="interstate">Another state</option></select>
          </section>
          }
          {state.error ? <p className="workflow-error" role="alert">{state.error}</p> : null}
          <div className="profile-form-actions">
            {formStep === 2 ? <button className="secondary-button" type="button" onClick={() => setFormStep(1)}>Back</button> : null}
            {formStep === 1 ? <button className="primary-cta" type="button" onClick={(event) => { if (event.currentTarget.form?.reportValidity()) setFormStep(2); }}>Continue to purchase details<ArrowRight /></button> : <button className="primary-cta" type="submit" disabled={state.pending}>{state.pending ? "Confirming vehicle…" : "Confirm vehicle and continue"}<ArrowRight /></button>}
          </div>
        </form>
        <details className="panel vehicle-form-assurance"><summary>What happens next</summary><div><ShieldCheck /><ul><li><CheckCircle2 />You’ll add an RC and sale document.</li><li><FileCheck2 />We’ll extract and show the matched facts.</li><li><Car />Only then can the transfer simulation start.</li></ul><p>Sample evidence is visibly watermarked and follows the same verification path as an uploaded file.</p></div></details>
      </div>
    </div>
  </main>;
}
