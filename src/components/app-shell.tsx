"use client";

import Link from "next/link";
import { CircleHelp, LogOut, RotateCcw, ShieldCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
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
  const { resetJourney } = useJourney();
  const router = useRouter();
  const pathname = usePathname();
  async function reset() {
    await resetJourney();
    router.push("/");
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="app-header">
      <Brand />
      <div className="header-actions">
        {pathname === "/login" ? <span className="prototype-pill"><ShieldCheck size={15} /> Evaluation access</span> : <>
          <span className="prototype-pill"><ShieldCheck size={15} /> Sandbox</span>
          <button className="header-button" type="button" onClick={reset}><RotateCcw size={17} /> Reset journey</button>
          <button className="header-button" type="button"><CircleHelp size={18} /> Help</button>
          <button className="avatar avatar-button" type="button" onClick={logout} aria-label="Sign out Ananya Sharma"><span>AS</span><LogOut /></button>
        </>}
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
