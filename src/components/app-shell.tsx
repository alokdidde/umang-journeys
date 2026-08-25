"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Activity, CircleHelp, Files, House, LogOut, RotateCcw, Route, ShieldCheck } from "lucide-react";
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
  useEffect(() => {
    if (pathname === "/login") return;
    let disposed = false;
    async function verifySession() {
      const response = await fetch("/api/auth/session", { cache: "no-store" }).catch(() => null);
      if (disposed || response?.ok || response?.status !== 401) return;
      const returnTo = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
    void verifySession();
    const handlePageShow = () => { void verifySession(); };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      disposed = true;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [pathname]);
  async function reset() {
    await resetJourney();
    router.push("/");
  }
  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) return;
    window.location.replace("/login");
  }
  if (pathname === "/login") {
    return <><header className="login-header"><Brand /><span className="prototype-pill"><ShieldCheck size={15} /> Evaluation demo</span></header><div id="main-content" tabIndex={-1}>{children}</div></>;
  }

  return (
    <>
      <header className="app-header">
        <Brand />
        <nav className="primary-navigation" aria-label="Primary navigation">
          <NavLink href="/" label="Home" icon={<House />} active={pathname === "/"} />
          <NavLink href="/journeys" label="Journeys" icon={<Route />} active={pathname.startsWith("/journeys")} />
          <NavLink href="/documents" label="Documents" icon={<Files />} active={pathname.startsWith("/documents")} />
          <NavLink href="/activity" label="Activity" icon={<Activity />} active={pathname.startsWith("/activity")} />
        </nav>
        <div className="header-actions">
          <span className="prototype-pill"><ShieldCheck size={15} /> Demo</span>
          <button className="header-button demo-control" type="button" onClick={reset}><RotateCcw size={17} /> Reset</button>
          <a className="header-button help-control" href="https://web.umang.gov.in/landing/faq" target="_blank" rel="noreferrer"><CircleHelp size={18} /><span>Help</span></a>
          <button className="avatar avatar-button" type="button" onClick={logout} aria-label="Sign out Ananya Sharma"><span>AS</span><LogOut /></button>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
      <nav className="mobile-navigation" aria-label="Primary navigation">
        <NavLink href="/" label="Home" icon={<House />} active={pathname === "/"} />
        <NavLink href="/journeys" label="Journeys" icon={<Route />} active={pathname.startsWith("/journeys")} />
        <NavLink href="/documents" label="Documents" icon={<Files />} active={pathname.startsWith("/documents")} />
        <NavLink href="/activity" label="Activity" icon={<Activity />} active={pathname.startsWith("/activity")} />
      </nav>
    </>
  );
}

function NavLink({ href, label, helper, icon, active }: { href: string; label: string; helper?: string; icon: React.ReactNode; active: boolean }) {
  return <Link href={href} className={active ? "active" : ""} aria-label={label} aria-current={active ? "page" : undefined}>{icon}<span><strong>{label}</strong>{helper ? <small aria-hidden="true">{helper}</small> : null}</span></Link>;
}

export function ScenicBackdrop() {
  return <div className="scenic-backdrop" aria-hidden="true" />;
}

export function TrustNote({ children = "Prototype experience using synthetic data only." }: { children?: React.ReactNode }) {
  return <p className="trust-note"><ShieldCheck size={15} />{children}</p>;
}
