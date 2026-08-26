"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Activity, CircleHelp, Files, House, Languages, LoaderCircle, LogOut, MoreHorizontal, RotateCcw, Route, ShieldCheck, Volume2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useJourney } from "./journey-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";

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
  const [logoutState, setLogoutState] = useState<"idle" | "pending" | "error">("idle");
  const [locale, setLocale] = useState<"en-IN" | "hi-IN">("en-IN");
  useEffect(() => {
    const saved = window.localStorage.getItem("umang-locale");
    const timer = window.setTimeout(() => { if (saved === "hi-IN") setLocale("hi-IN"); }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { document.documentElement.lang = locale === "hi-IN" ? "hi" : "en"; }, [locale]);
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
    setLogoutState("pending");
    const response = await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    if (!response?.ok) {
      setLogoutState("error");
      return;
    }
    window.location.replace("/login");
  }
  function toggleLocale() {
    const next = locale === "en-IN" ? "hi-IN" : "en-IN";
    setLocale(next);
    window.localStorage.setItem("umang-locale", next);
  }
  function readPage() {
    const text = [...document.querySelectorAll("#main-content h1, #main-content h2, #main-content p")].slice(0, 8).map((node) => node.textContent?.trim()).filter(Boolean).join(". ");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    window.speechSynthesis.speak(utterance);
  }
  const labels = locale === "hi-IN" ? { home: "होम", journeys: "यात्राएँ", documents: "दस्तावेज़", activity: "काम", reset: "रीसेट", help: "सहायता", signOut: "साइन आउट" } : { home: "Home", journeys: "Journeys", documents: "Documents", activity: "Activity", reset: "Reset", help: "Help", signOut: "Sign out" };
  if (pathname === "/login") {
    return <><header className="login-header"><Brand /><span className="prototype-pill"><ShieldCheck size={15} /> Evaluation demo</span></header><div id="main-content" tabIndex={-1}>{children}</div></>;
  }

  return (
    <>
      <header className="app-header">
        <Brand />
        <nav className="primary-navigation" aria-label="Primary navigation">
          <NavLink href="/" label={labels.home} icon={<House />} active={pathname === "/"} />
          <NavLink href="/journeys" label={labels.journeys} icon={<Route />} active={pathname.startsWith("/journeys")} />
          <NavLink href="/documents" label={labels.documents} icon={<Files />} active={pathname.startsWith("/documents")} />
          <NavLink href="/activity" label={labels.activity} icon={<Activity />} active={pathname.startsWith("/activity")} />
        </nav>
        <div className="header-actions">
          <span className="prototype-pill"><ShieldCheck size={15} /> Demo</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="header-button options-control" type="button" aria-label="Page options"><MoreHorizontal size={18} /><span>Options</span></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="header-options-menu" align="end">
              <DropdownMenuItem onSelect={toggleLocale}><Languages />{locale === "en-IN" ? "हिंदी में देखें" : "View in English"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={readPage}><Volume2 />Read this page aloud</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { void reset(); }}><RotateCcw />{labels.reset} demo</DropdownMenuItem>
              <DropdownMenuItem asChild><a href="https://web.umang.gov.in/landing/faq" target="_blank" rel="noreferrer"><CircleHelp />{labels.help}</a></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="sr-only" aria-live="polite">{logoutState === "pending" ? "Signing out…" : logoutState === "error" ? "Could not sign out. Try again." : ""}</span>
          <button className="header-button sign-out-control" type="button" onClick={logout} disabled={logoutState === "pending"} data-error={logoutState === "error" || undefined} aria-label="Sign out Ananya Sharma">{logoutState === "pending" ? <LoaderCircle className="service-spinner" aria-hidden="true" /> : <LogOut aria-hidden="true" />}<span>{logoutState === "pending" ? "Signing out…" : logoutState === "error" ? "Try sign out again" : labels.signOut}</span></button>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
      <nav className="mobile-navigation" aria-label="Primary navigation">
        <NavLink href="/" label={labels.home} icon={<House />} active={pathname === "/"} />
        <NavLink href="/journeys" label={labels.journeys} icon={<Route />} active={pathname.startsWith("/journeys")} />
        <NavLink href="/documents" label={labels.documents} icon={<Files />} active={pathname.startsWith("/documents")} />
        <NavLink href="/activity" label={labels.activity} icon={<Activity />} active={pathname.startsWith("/activity")} />
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
