"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, ChevronRight, CircleHelp, Files, House, LogOut, RotateCcw, Route, ShieldCheck } from "lucide-react";
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

export function AppShell({ children }: { children: ReactNode }) {
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
  if (pathname === "/login") {
    return <><header className="login-header"><Brand /><span className="prototype-pill"><ShieldCheck size={15} /> Evaluation access</span></header><div id="main-content" tabIndex={-1}>{children}</div></>;
  }

  const section = getSection(pathname);
  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Brand />
        <div className="sidebar-account"><span className="avatar">AS</span><div><strong>Ananya Sharma</strong><small>Evaluation citizen</small></div></div>
        <nav className="primary-navigation" aria-label="Primary navigation">
          <NavLink href="/" label="Home" helper="Your next actions" icon={<House />} active={pathname === "/"} />
          <NavLink href="/journeys" label="Journeys" helper="Plans in progress" icon={<Route />} active={pathname.startsWith("/journeys")} />
          <NavLink href="/documents" label="Documents" helper="Files and records" icon={<Files />} active={pathname.startsWith("/documents")} />
          <NavLink href="/activity" label="Activity" helper="Account history" icon={<Activity />} active={pathname.startsWith("/activity")} />
        </nav>
        <div className="sidebar-footer">
          <span className="prototype-pill"><ShieldCheck size={15} /> Secure sandbox</span>
          <button className="header-button" type="button" onClick={reset}><RotateCcw size={17} /> Reset journey</button>
          <a className="header-button" href="https://web.umang.gov.in/landing/faq" target="_blank" rel="noreferrer"><CircleHelp size={18} /> Help centre</a>
          <button className="header-button" type="button" onClick={logout}><LogOut size={17} /> Sign out</button>
        </div>
      </aside>
      <header className="app-topbar">
        <div className="mobile-brand"><Brand /></div>
        <div className="page-context"><span>Citizen workspace</span><ChevronRight /><strong>{section}</strong></div>
        <div className="topbar-actions"><span className="prototype-pill"><ShieldCheck size={15} /> Sandbox</span><button className="avatar avatar-button" type="button" onClick={logout} aria-label="Sign out Ananya Sharma"><span>AS</span><LogOut /></button></div>
      </header>
      <div id="main-content" className="app-content" tabIndex={-1}>{children}</div>
      <nav className="mobile-navigation" aria-label="Primary navigation">
        <NavLink href="/" label="Home" icon={<House />} active={pathname === "/"} />
        <NavLink href="/journeys" label="Journeys" icon={<Route />} active={pathname.startsWith("/journeys")} />
        <NavLink href="/documents" label="Documents" icon={<Files />} active={pathname.startsWith("/documents")} />
        <NavLink href="/activity" label="Activity" icon={<Activity />} active={pathname.startsWith("/activity")} />
      </nav>
    </div>
  );
}

function NavLink({ href, label, helper, icon, active }: { href: string; label: string; helper?: string; icon: React.ReactNode; active: boolean }) {
  return <Link href={href} className={active ? "active" : ""} aria-label={label} aria-current={active ? "page" : undefined}>{icon}<span><strong>{label}</strong>{helper ? <small aria-hidden="true">{helper}</small> : null}</span></Link>;
}

function getSection(pathname: string) {
  if (pathname.startsWith("/documents")) return "Documents";
  if (pathname.startsWith("/activity")) return "Activity";
  if (pathname.startsWith("/intake")) return "Create a journey";
  if (pathname.includes("birth-registration")) return "Birth registration";
  if (pathname.includes("vehicle-details")) return "Vehicle details";
  if (pathname.includes("/services/")) return "Service workspace";
  if (pathname.startsWith("/journeys/")) return "Journey detail";
  if (pathname.startsWith("/journeys")) return "Journeys";
  return "Home";
}

export function ScenicBackdrop() {
  return <div className="scenic-backdrop" aria-hidden="true" />;
}

export function TrustNote({ children = "Prototype experience using synthetic data only." }: { children?: React.ReactNode }) {
  return <p className="trust-note"><ShieldCheck size={15} />{children}</p>;
}
