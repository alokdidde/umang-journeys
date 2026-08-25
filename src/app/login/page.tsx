"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("demo@umang.com");
  const [password, setPassword] = useState("demo1234");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Sign in failed.");
      const returnTo = searchParams.get("returnTo");
      const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\") && !returnTo.startsWith("/login") ? returnTo : "/";
      router.replace(safeReturnTo);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-scene" aria-hidden="true" />
      <section className="signed-out-gateway" aria-labelledby="signed-out-heading">
        <header className="login-promise">
          <p>Public services, organised around your life</p>
          <h1 id="signed-out-heading">Life changes. Your next step stays clear.</h1>
          <p>Having a baby, moving home, buying a vehicle, planning healthcare or retiring—UMANG Journeys keeps each path simple.</p>
        </header>
        <section className="login-card panel" aria-labelledby="login-heading">
          <header className="login-card-heading">
            <span className="login-lock" aria-hidden="true"><LockKeyhole /></span>
            <div>
              <p>Evaluation demo</p>
              <h2 id="login-heading">Continue as Ananya</h2>
              <span>The demo details are already filled in.</span>
            </div>
          </header>
          <form onSubmit={login} aria-busy={pending}>
            <label htmlFor="evaluation-email"><span>Email address</span></label>
            <div className="login-field"><Mail aria-hidden="true" /><input id="evaluation-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" spellCheck={false} required /></div>
            <label htmlFor="evaluation-password"><span>Password</span></label>
            <div className="login-field"><LockKeyhole aria-hidden="true" /><input id="evaluation-password" name="password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /><button className="login-password-action" type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible}>{passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}<span>{passwordVisible ? "Hide" : "Show"}</span></button></div>
            {error && <p className="login-error" role="alert" ref={errorRef} tabIndex={-1}><AlertCircle aria-hidden="true" /><span>{error}</span></p>}
            <button type="submit" className="primary-cta" disabled={pending}>{pending ? <LoaderCircle className="service-spinner" aria-hidden="true" /> : null}<span>{pending ? "Opening the demo…" : "Open the guided demo"}</span>{pending ? null : <ArrowRight aria-hidden="true" />}</button>
          </form>
          <footer><ShieldCheck aria-hidden="true" /> Synthetic records only. No real service is contacted.</footer>
        </section>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="login-page"><p>Loading secure access…</p></main>}><LoginForm /></Suspense>;
}
