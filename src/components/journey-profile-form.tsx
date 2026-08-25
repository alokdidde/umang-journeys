"use client";

import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CheckCircle2, FileCheck2, FolderClock, House, ShieldCheck } from "lucide-react";
import { useJourney } from "@/components/journey-provider";

type ProfileKind = "move" | "business" | "retirement";

const content = {
  move: {
    nodeKey: "move_profile" as const,
    icon: House,
    eyebrow: "Step 1 · Confirm the move",
    title: "Where are you moving?",
    intro: "Confirm one household move. Each person and authority will still have a separate address request.",
    submit: "Confirm move and continue",
    pending: "Saving your move…",
    assurance: ["You’ll check a real address document.", "Aadhaar and voter requests stay separate.", "The final pack tracks every provider update."],
  },
  business: {
    nodeKey: "business_profile" as const,
    icon: BriefcaseBusiness,
    eyebrow: "Step 1 · Confirm the business",
    title: "What business are you starting?",
    intro: "These facts shape the registration checklists. They do not incorporate, license, or approve the business.",
    submit: "Confirm business and continue",
    pending: "Saving your business…",
    assurance: ["You’ll check the principal-place evidence.", "Udyam and GST stay separate.", "The final pack covers the first 90 days."],
  },
  retirement: {
    nodeKey: "retirement_profile" as const,
    icon: FolderClock,
    eyebrow: "Step 1 · Confirm the transition",
    title: "What does retirement look like for you?",
    intro: "We’ll organise records and possible claim paths. We will not make pension or investment decisions.",
    submit: "Confirm retirement and continue",
    pending: "Saving your retirement plan…",
    assurance: ["You’ll check one retirement statement.", "EPFO, EPS, NPS, and employer routes stay separate.", "Any benefit result remains an indication."],
  },
} as const;

export function JourneyProfileForm({ kind }: { kind: ProfileKind }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, loadJourney, completeProfileStep } = useJourney();
  const copy = content[kind];
  const Icon = copy.icon;
  const [values, setValues] = useState<Record<string, string>>(() => defaults(kind, state.facts));
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => { if (id && state.journeyId !== id) void loadJourney(id); }, [id, loadJourney, state.journeyId]);

  function set(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const ok = await completeProfileStep(id, copy.nodeKey, values);
    if (ok) window.setTimeout(() => router.push(`/journeys/${id}`), 120);
  }

  return <main className="page vehicle-details-page journey-profile-page">
    <div className="service-shell">
      <Link href={`/journeys/${id}`} className="floating-back"><ArrowLeft />Back to journey</Link>
      <header className="vehicle-form-heading"><span><Icon /></span><div><p className="eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1><p>{copy.intro}</p></div></header>
      <div className="vehicle-form-layout">
        <form ref={formRef} className="panel vehicle-details-form" onSubmit={submit}>
          <p className="form-step-label">Part {formStep} of 2</p>
          {kind === "move" ? <MoveFields values={values} set={set} part={formStep} /> : kind === "business" ? <BusinessFields values={values} set={set} part={formStep} /> : <RetirementFields values={values} set={set} part={formStep} />}
          {state.error ? <p className="workflow-error" role="alert">{state.error}</p> : null}
          <div className="profile-form-actions">
            {formStep === 2 ? <button className="secondary-button" type="button" onClick={() => setFormStep(1)}>Back</button> : null}
            {formStep === 1
              ? <button className="primary-cta" type="button" onClick={() => { if (formRef.current?.reportValidity()) setFormStep(2); }}>Continue to the next part<ArrowRight /></button>
              : <button className="primary-cta" type="submit" disabled={state.pending}>{state.pending ? copy.pending : copy.submit}<ArrowRight /></button>}
          </div>
        </form>
        <details className="panel vehicle-form-assurance"><summary>What happens next</summary><div><ShieldCheck /><ul>{copy.assurance.map((item, index) => <li key={item}>{index === 0 ? <FileCheck2 /> : <CheckCircle2 />}{item}</li>)}</ul><p>All provider responses and generated documents stay synthetic and visibly labelled.</p></div></details>
      </div>
    </div>
  </main>;
}

function defaults(kind: ProfileKind, facts: Record<string, string>): Record<string, string> {
  if (kind === "move") return {
    "person.name": facts["person.name"] ?? "Ananya Sharma",
    "move.newAddress": facts["move.newAddress"] ?? "12 Lake View Road, Madhapur",
    "move.newCity": facts["move.newCity"] ?? "Hyderabad",
    "move.newState": facts["move.newState"] ?? "Telangana",
    "move.pinCode": facts["move.pinCode"] ?? "500081",
    "move.date": facts["move.date"] ?? "2026-09-25",
    "move.occupancy": facts["move.occupancy"] ?? "rented",
    "household.size": facts["household.size"] ?? "3",
    "move.hasEpic": facts["move.hasEpic"] ?? "yes",
  };
  if (kind === "business") return {
    "business.name": facts["business.name"] ?? "Ananya Design Studio",
    "business.activity": facts["business.activity"] ?? "Design services",
    "business.structure": facts["business.structure"] === "not_sure" ? "sole_proprietorship" : facts["business.structure"] ?? "sole_proprietorship",
    "business.address": facts["business.address"] ?? "4 Creative Lane, Jubilee Hills",
    "business.city": facts["business.city"] ?? "Hyderabad",
    "business.state": facts["business.state"] ?? "Telangana",
    "business.startDate": facts["business.startDate"] ?? "2026-09-01",
    "business.occupancy": facts["business.occupancy"] ?? "rented",
    "business.expectedTurnover": facts["business.expectedTurnover"] ?? "800000",
    "business.interstateSupplies": facts["business.interstateSupplies"] ?? "no",
  };
  return {
    "person.name": facts["person.name"] ?? "Ananya Sharma",
    "person.dateOfBirth": facts["person.dateOfBirth"] ?? "1968-09-30",
    "retirement.date": facts["retirement.date"] ?? "2026-09-30",
    "retirement.employmentSector": facts["retirement.employmentSector"] ?? "private",
    "retirement.accountType": facts["retirement.accountType"] ?? "epfo",
    "retirement.serviceYears": facts["retirement.serviceYears"] ?? "14",
    "retirement.pensionStarted": facts["retirement.pensionStarted"] ?? "no",
  };
}

function Input({ id, label, value, set, type = "text", ...props }: { id: string; label: string; value: string; set: (key: string, value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "value" | "onChange">) {
  return <><label htmlFor={id}>{label}</label><input id={id} name={id} type={type} value={value} onChange={(event) => set(id, event.target.value)} {...props} /></>;
}

function Select({ id, label, value, set, children }: { id: string; label: string; value: string; set: (key: string, value: string) => void; children: ReactNode }) {
  return <><label htmlFor={id}>{label}</label><select id={id} name={id} value={value} onChange={(event) => set(id, event.target.value)}>{children}</select></>;
}

function MoveFields({ values, set, part }: { values: Record<string, string>; set: (key: string, value: string) => void; part: 1 | 2 }) {
  return part === 1 ? <section><h2>New home</h2><p>Use the complete address you expect to show on official records.</p>
    <Input id="person.name" label="Primary resident" value={values["person.name"]} set={set} autoComplete="name" required />
    <Input id="move.newAddress" label="House, building, street, and area" value={values["move.newAddress"]} set={set} autoComplete="street-address" required />
    <Input id="move.newCity" label="City" value={values["move.newCity"]} set={set} autoComplete="address-level2" required />
    <Select id="move.newState" label="State" value={values["move.newState"]} set={set}><option>Telangana</option><option>Andhra Pradesh</option><option>Karnataka</option><option>Maharashtra</option><option>Delhi</option></Select>
    <Input id="move.pinCode" label="PIN code" value={values["move.pinCode"]} set={set} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="postal-code" required />
  </section> : <section><h2>Your move</h2><p>This helps order the updates and evidence checks.</p>
    <Input id="move.date" label="Move date" value={values["move.date"]} set={set} type="date" required />
    <Select id="move.occupancy" label="How do you occupy the new home?" value={values["move.occupancy"]} set={set}><option value="rented">Rented</option><option value="owned">Owned</option><option value="family">With family</option><option value="not_sure">I’m not sure</option></Select>
    <Input id="household.size" label="People moving" value={values["household.size"]} set={set} type="number" min={1} max={20} required />
    <Select id="move.hasEpic" label="Do you have a voter ID or EPIC number?" value={values["move.hasEpic"]} set={set}><option value="yes">Yes</option><option value="not_sure">I’m not sure</option><option value="no">No</option></Select>
  </section>;
}

function BusinessFields({ values, set, part }: { values: Record<string, string>; set: (key: string, value: string) => void; part: 1 | 2 }) {
  return part === 1 ? <section><h2>Business basics</h2><p>Choose the structure you intend to use; official checks may change the path.</p>
    <Input id="business.name" label="Business name" value={values["business.name"]} set={set} required />
    <Input id="business.activity" label="Main activity" value={values["business.activity"]} set={set} required />
    <Select id="business.structure" label="Proposed structure" value={values["business.structure"]} set={set}><option value="sole_proprietorship">Sole proprietorship</option><option value="partnership">Partnership</option><option value="llp">LLP</option><option value="company">Company</option><option value="not_sure">I’m not sure</option></Select>
    <Input id="business.startDate" label="Expected start date" value={values["business.startDate"]} set={set} type="date" required />
  </section> : <section><h2>Principal place & supplies</h2><p>These facts shape evidence and GST readiness, not a liability decision.</p>
    <Input id="business.address" label="Premises address" value={values["business.address"]} set={set} autoComplete="street-address" required />
    <Input id="business.city" label="City" value={values["business.city"]} set={set} required />
    <Select id="business.state" label="State" value={values["business.state"]} set={set}><option>Telangana</option><option>Andhra Pradesh</option><option>Karnataka</option><option>Maharashtra</option><option>Delhi</option></Select>
    <Select id="business.occupancy" label="Nature of possession" value={values["business.occupancy"]} set={set}><option value="rented">Rented</option><option value="owned">Owned</option><option value="consent">With owner consent</option><option value="shared">Shared</option></Select>
    <Input id="business.expectedTurnover" label="Expected annual turnover (₹)" value={values["business.expectedTurnover"]} set={set} type="number" inputMode="numeric" min={0} required />
    <Select id="business.interstateSupplies" label="Will you supply outside your state?" value={values["business.interstateSupplies"]} set={set}><option value="yes">Yes</option><option value="not_sure">I’m not sure</option><option value="no">No</option></Select>
  </section>;
}

function RetirementFields({ values, set, part }: { values: Record<string, string>; set: (key: string, value: string) => void; part: 1 | 2 }) {
  return part === 1 ? <section><h2>About you</h2><p>These details help identify the official record and age-dependent routes to verify.</p>
    <Input id="person.name" label="Full name" value={values["person.name"]} set={set} autoComplete="name" required />
    <Input id="person.dateOfBirth" label="Date of birth" value={values["person.dateOfBirth"]} set={set} type="date" required />
    <Input id="retirement.date" label="Retirement date" value={values["retirement.date"]} set={set} type="date" required />
    <Select id="retirement.employmentSector" label="Employment route" value={values["retirement.employmentSector"]} set={set}><option value="private">Private employment</option><option value="central_government">Central government</option><option value="state_government">State government</option><option value="self_employed">Self-employed</option><option value="not_sure">I’m not sure</option></Select>
  </section> : <section><h2>Records you expect</h2><p>It is fine if you are unsure. The next steps will ask you to verify, not guess.</p>
    <Select id="retirement.accountType" label="Main retirement record" value={values["retirement.accountType"]} set={set}><option value="epfo">EPFO / EPS</option><option value="nps">NPS</option><option value="employer_pension">Employer pension</option><option value="multiple">More than one</option><option value="not_sure">I’m not sure</option></Select>
    <Input id="retirement.serviceYears" label="Years of eligible or recorded service" value={values["retirement.serviceYears"]} set={set} type="number" min={0} max={60} required />
    <Select id="retirement.pensionStarted" label="Has a pension already started?" value={values["retirement.pensionStarted"]} set={set}><option value="yes">Yes</option><option value="not_sure">I’m not sure</option><option value="no">No</option></Select>
  </section>;
}
