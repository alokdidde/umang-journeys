"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

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
      router.replace(returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
      setPending(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-scene" aria-hidden="true" />
      <section className="login-card panel">
        <span className="login-lock"><LockKeyhole /></span>
        <span className="eyebrow">Private evaluation</span>
        <h1>Welcome to UMANG Journeys</h1>
        <p>Sign in with the evaluation account shared with you. Account creation is intentionally disabled.</p>
        <form onSubmit={login}>
          <label><span>Email address</span><div><Mail /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></div></label>
          <label><span>Password</span><div><LockKeyhole /><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></div></label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="primary-cta" disabled={pending}>{pending ? "Signing in…" : "Sign in to the evaluation"}<ArrowRight /></button>
        </form>
        <footer><ShieldCheck /> One seeded user · No registration · Sandbox integrations</footer>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="login-page"><p>Loading secure access…</p></main>}><LoginForm /></Suspense>;
}
