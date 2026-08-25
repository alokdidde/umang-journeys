"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Baby, Building2, CalendarDays, CheckCircle2, FileCheck2, House, ShieldCheck, Users } from "lucide-react";
import { useJourney } from "@/components/journey-provider";

const known = <span className="known-tag">Already known <CheckCircle2 /></span>;

export default function RegistrationPage() {
  const { state, dispatch } = useJourney();
  const router = useRouter();
  function submit(event: React.FormEvent) {
    event.preventDefault();
    const valid = state.form.childName.trim() && state.form.localWard.trim();
    dispatch({ type: "submit_registration" });
    if (valid) router.push("/journeys/demo-new-baby/success");
  }
  return (
    <main className="page registration-page">
      <div className="subtle-scene" aria-hidden="true" />
      <div className="form-progress content-layer"><span className="active">1<small>Review &amp; Confirm</small></span><i /><span>2<small>Documents</small></span><i /><span>3<small>Preview</small></span><i /><span>4<small>Complete</small></span></div>
      <header className="registration-heading content-layer"><h1>We already filled most of this in.</h1><p>We imported synthetic details from your hospital record and profile. You only need to fill two details.</p></header>
      <div className="registration-layout content-layer">
        <aside className="source-card panel">
          <div className="source-title"><strong>Imported from hospital</strong><span><ShieldCheck />Synthetic</span></div>
          <span className="source-icon"><Building2 /></span><h2>Apollo Hospital</h2><p>Hyderabad, Telangana</p>
          <dl><div><dt><CalendarDays />Date &amp; time of birth</dt><dd>24 August 2026, 08:24 AM</dd></div><div><dt><Baby />Birth weight</dt><dd>3.12 kg</dd></div></dl>
          <footer><ShieldCheck /> Demo record generated on 24 August 2026</footer>
        </aside>
        <form className="registration-form panel" onSubmit={submit} noValidate>
          <FormSection Icon={Baby} title="Child details">
            <Field label="Child’s name" error={state.formErrors.childName}><input value={state.form.childName} onChange={(event) => dispatch({ type: "set_field", field: "childName", value: event.target.value })} placeholder="Enter child’s full name" aria-invalid={!!state.formErrors.childName} /></Field>
            <Field label="Date & time of birth"><div className="known-field">24 August 2026, 08:24 AM {known}</div></Field>
            <Field label="Gender"><div className="known-field">Female {known}</div></Field>
            <Field label="Birth weight"><div className="known-field">3.12 kg {known}</div></Field>
          </FormSection>
          <FormSection Icon={Users} title="Parents">
            <Field label="Mother’s name"><div className="known-field">Ananya Sharma {known}</div></Field>
            <Field label="Mother’s identity"><div className="known-field">XXXX XXXX 1234 {known}</div></Field>
            <Field label="Father’s name"><div className="known-field">Rahul Sharma {known}</div></Field>
            <Field label="Father’s identity"><div className="known-field">XXXX XXXX 5678 {known}</div></Field>
          </FormSection>
          <FormSection Icon={Building2} title="Hospital">
            <Field label="Hospital"><div className="known-field">Apollo Hospital {known}</div></Field>
            <Field label="Place of birth"><div className="known-field">Hyderabad, Telangana {known}</div></Field>
          </FormSection>
          <FormSection Icon={House} title="Address">
            <Field label="House / Building"><div className="known-field">12, Jubilee Hills {known}</div></Field>
            <Field label="Local ward / area" error={state.formErrors.localWard}><select value={state.form.localWard} onChange={(event) => dispatch({ type: "set_field", field: "localWard", value: event.target.value })} aria-invalid={!!state.formErrors.localWard}><option value="">Select your ward / area</option><option>Ward 72 — Serilingampally</option><option>Ward 95 — Jubilee Hills</option></select></Field>
            <Field label="City / District"><div className="known-field">Hyderabad {known}</div></Field>
            <Field label="PIN code"><div className="known-field">500033 {known}</div></Field>
          </FormSection>
          <div className="form-submit-bar"><div><FileCheck2 /><span><strong>Only 2 details are needed</strong><small>Fill the highlighted information to continue.</small></span></div><button type="submit" className="primary-cta">Submit Demo Registration<ArrowRight /></button></div>
        </form>
      </div>
    </main>
  );
}

function FormSection({ Icon, title, children }: { Icon: typeof Baby; title: string; children: React.ReactNode }) {
  return <section className="form-section"><h2><span><Icon /></span>{title}</h2><div className="field-grid">{children}</div></section>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className={error ? "field error" : "field"}><span>{label}</span>{children}{error && <em>{error}</em>}</label>;
}
