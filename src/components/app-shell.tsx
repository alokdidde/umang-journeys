"use client";

import Link from "next/link";
import { CircleHelp, RotateCcw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useJourney } from "./journey-provider";

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="UMANG Journeys home">
      <span className="brand-mark" aria-hidden="true"><i /><b /></span>
      <span><strong>UMANG</strong><small>Journeys</small></span>
    </Link>
  );
}

export function AppHeader() {
  const { dispatch } = useJourney();
  const router = useRouter();
  function reset() {
    dispatch({ type: "reset" });
    router.push("/");
  }
  return (
    <header className="app-header">
      <Brand />
      <div className="header-actions">
        <span className="prototype-pill"><ShieldCheck size={15} /> Prototype</span>
        <button className="header-button" type="button" onClick={reset}><RotateCcw size={17} /> Reset demo</button>
        <button className="header-button" type="button"><CircleHelp size={18} /> Help</button>
        <span className="avatar" aria-label="Synthetic demo profile">AS</span>
      </div>
    </header>
  );
}

export function ScenicBackdrop() {
  return <div className="scenic-backdrop" aria-hidden="true" />;
}

export function TrustNote({ children = "Prototype experience using synthetic data only." }: { children?: React.ReactNode }) {
  return <p className="trust-note"><ShieldCheck size={15} />{children}</p>;
}
