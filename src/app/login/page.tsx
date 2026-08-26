"use client";

import { FormEvent, Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowRight,
  Baby,
  BriefcaseBusiness,
  Building2,
  CarFront,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  FileCheck2,
  FileText,
  HeartPulse,
  Home,
  IdCard,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPinned,
  MessageSquareText,
  Route,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRoundCheck,
} from "lucide-react";
import styles from "./login.module.css";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const journeyFamilies = [
  { label: "Having a baby", Icon: Baby, tone: "rose" },
  { label: "Moving home", Icon: Home, tone: "green" },
  { label: "Buying a vehicle", Icon: CarFront, tone: "blue" },
  { label: "Health & insurance", Icon: HeartPulse, tone: "green" },
  { label: "Starting a business", Icon: BriefcaseBusiness, tone: "purple" },
  { label: "Retirement", Icon: Clock3, tone: "amber" },
] as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState("demo@umang.com");
  const [password, setPassword] = useState("demo1234");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useGSAP(() => {
    const media = gsap.matchMedia();

    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from("[data-hero-context]", { opacity: 0, y: 10, duration: 0.22 })
        .from("[data-hero-title]", { opacity: 0, y: 16, duration: 0.28 }, "-=0.08")
        .from("[data-hero-support]", { opacity: 0, y: 12, duration: 0.24 }, "-=0.1")
        .from("[data-hero-visual]", { opacity: 0, y: 18, duration: 0.32 }, "-=0.08");

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          opacity: 0,
          y: 16,
          duration: 0.24,
          ease: "power3.out",
          scrollTrigger: { trigger: element, start: "top 86%", once: true },
        });
      });

      gsap.fromTo("[data-progress-path]", { scaleY: 0 }, {
        scaleY: 1,
        transformOrigin: "top",
        ease: "none",
        scrollTrigger: {
          trigger: "[data-guided-story]",
          start: "top 55%",
          end: "bottom 70%",
          scrub: true,
        },
      });

      gsap.to("[data-landscape]", {
        yPercent: 4,
        ease: "none",
        scrollTrigger: { trigger: pageRef.current, start: "top top", end: "bottom top", scrub: 0.6 },
      });
    });

    media.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set("[data-progress-path]", { scaleY: 1, transformOrigin: "top" });
    });

    return () => media.revert();
  }, { scope: pageRef });

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
      window.setTimeout(() => errorRef.current?.focus(), 0);
    }
  }

  return (
    <main className={styles.page} ref={pageRef}>
      <section className={styles.hero} aria-labelledby="signed-out-heading" id="top">
        <div className={styles.landscape} data-landscape aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.kicker} data-hero-context><Sparkles aria-hidden="true" /> Public services, organised around your life</p>
            <h1 id="signed-out-heading" data-hero-title>Find the government services you need</h1>
            <div className={styles.heroSupport} data-hero-support>
              <p>Tell UMANG what changed. It brings the right services into one guided journey and keeps the next useful step clear.</p>
              <div className={styles.heroActions}>
                <a className={styles.primaryLink} href="#demo-access">Open the demo <ArrowRight aria-hidden="true" /></a>
                <a className={styles.secondaryLink} href="#how-it-works">See how it works <ArrowDown aria-hidden="true" /></a>
              </div>
            </div>
          </div>

          <div className={styles.journeyPreview} data-hero-visual aria-label="Example having a baby journey">
            <header className={styles.previewHeader}>
              <div><span className={styles.previewAvatar}><Baby aria-hidden="true" /></span><div><small>Ananya’s family</small><strong>Having a baby</strong></div></div>
              <p><span>2 of 6</span> steps complete</p>
            </header>
            <div className={styles.previewFlow}>
              <article className={`${styles.previewNode} ${styles.nodeComplete}`}>
                <span><Check aria-hidden="true" /></span>
                <div><small>Completed</small><strong>Birth registration</strong><p>Hospital record matched</p></div>
              </article>
              <span className={styles.flowArrow} aria-hidden="true"><ArrowRight /></span>
              <article className={`${styles.previewNode} ${styles.nodeNext}`}>
                <span><FileCheck2 aria-hidden="true" /></span>
                <div><small>Recommended next</small><strong>Birth certificate</strong><p>Review and collect</p></div>
              </article>
              <span className={styles.branchStem} aria-hidden="true" />
              <div className={styles.previewBranches}>
                <div><HeartPulse aria-hidden="true" /><span><strong>Child health record</strong><small>Upcoming</small></span></div>
                <div><IdCard aria-hidden="true" /><span><strong>Child identity</strong><small>Upcoming</small></span></div>
                <div><Activity aria-hidden="true" /><span><strong>Vaccinations</strong><small>Optional path</small></span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.problemSection} id="why-umang" aria-labelledby="problem-heading">
        <div className={styles.sectionInner} data-reveal>
          <header className={styles.sectionHeading}>
            <span>Why this matters</span>
            <h2 id="problem-heading">A life event is rarely one form.</h2>
            <p>People experience a birth, a move or a health need. Government systems often present separate departments, rules and evidence requests.</p>
          </header>
          <div className={styles.beforeAfter}>
            <article className={styles.agencyView} aria-label="Separate agency services">
              <header><small>Agency by agency</small><strong>Work out every service yourself</strong></header>
              <div className={styles.agencyMap} aria-hidden="true">
                <span className={styles.agencyLineOne} /><span className={styles.agencyLineTwo} /><span className={styles.agencyLineThree} />
                <div><Building2 /><small>Municipal record</small></div>
                <div><HeartPulse /><small>Health system</small></div>
                <div><IdCard /><small>Identity service</small></div>
                <div><FileText /><small>Benefit scheme</small></div>
              </div>
            </article>
            <div className={styles.transformMark} aria-hidden="true"><ArrowRight /></div>
            <article className={styles.lifeView} aria-label="One guided life event journey">
              <header><small>Life event first</small><strong>See one path, in the right order</strong></header>
              <ol>
                <li><span><Check /></span><div><strong>Register the birth</strong><small>Done</small></div></li>
                <li><span>2</span><div><strong>Collect the certificate</strong><small>Do this next</small></div></li>
                <li><span>3</span><div><strong>Choose the branches you need</strong><small>Health · identity · benefits</small></div></li>
              </ol>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.howSection} id="how-it-works" aria-labelledby="how-heading" data-guided-story>
        <div className={`${styles.sectionInner} ${styles.howLayout}`}>
          <div className={styles.howCopy}>
            <p className={styles.kicker}><Route aria-hidden="true" /> A guided conversation</p>
            <h2 id="how-heading">Start with what happened. Not a department name.</h2>
            <p>UMANG asks for one useful detail at a time, confirms who the journey is for, and turns the answer into a visible next step.</p>
            <div className={styles.progressRail} aria-hidden="true"><span data-progress-path /></div>
          </div>
          <div className={styles.storySteps}>
            <article className={styles.storyCard} data-reveal>
              <span className={styles.storyNumber}>01</span>
              <header><MessageSquareText aria-hidden="true" /><div><small>Describe the event</small><h3>Use your own words</h3></div></header>
              <div className={styles.intakeExample}>
                <p>I bought a used Tata Nexon in Hyderabad.</p>
                <span><Upload aria-hidden="true" /> Attach the registration certificate</span>
              </div>
            </article>
            <article className={styles.storyCard} data-reveal>
              <span className={styles.storyNumber}>02</span>
              <header><UserRoundCheck aria-hidden="true" /><div><small>Confirm the people involved</small><h3>Keep every person distinct</h3></div></header>
              <div className={styles.peopleExample}>
                <div><span>A</span><strong>Ananya</strong><small>Account holder</small></div>
                <div className={styles.selectedPerson}><span>MP</span><strong>My parents</strong><small>Needs health cover</small><CheckCircle2 /></div>
              </div>
            </article>
            <article className={styles.storyCard} data-reveal>
              <span className={styles.storyNumber}>03</span>
              <header><MapPinned aria-hidden="true" /><div><small>Continue the right path</small><h3>Act on the next useful step</h3></div></header>
              <div className={styles.taskExample}>
                <span><Clock3 aria-hidden="true" /></span>
                <div><small>Tata Nexon · Suggested by 2 Sept</small><strong>Match policy and RC owner</strong><p>Confirm both records refer to the same person.</p></div>
                <ArrowRight aria-hidden="true" />
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.documentSection} id="documents" aria-labelledby="document-heading">
        <div className={styles.sectionInner} data-reveal>
          <header className={styles.sectionHeading}>
            <span>Documents that move work forward</span>
            <h2 id="document-heading">Upload evidence once. Let it find the right journey.</h2>
          </header>
          <div className={styles.documentFlow}>
            <article className={styles.documentSheet}>
              <div><FileText aria-hidden="true" /><span><small>Uploaded document</small><strong>Vehicle registration</strong></span></div>
              <dl><div><dt>Vehicle</dt><dd>Tata Nexon</dd></div><div><dt>Registration</dt><dd>TS 09 EX 4821</dd></div><div><dt>Owner</dt><dd>Ananya Sharma</dd></div></dl>
            </article>
            <div className={styles.scanStage} aria-label="AI checks the document"><ScanLine aria-hidden="true" /><strong>Read and match</strong><small>AI identifies the document, extracts the details and asks before updating anything.</small></div>
            <article className={styles.matchedJourney}>
              <header><CarFront aria-hidden="true" /><div><small>Matched journey</small><strong>Tata Nexon</strong></div><CheckCircle2 aria-hidden="true" /></header>
              <div><span>Next</span><strong>Transfer ownership</strong><ArrowRight aria-hidden="true" /></div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.scopeSection} id="journeys" aria-labelledby="scope-heading">
        <div className={styles.sectionInner} data-reveal>
          <div className={styles.scopeIntro}>
            <span className={styles.scopeNumber}>6</span>
            <div><small>Journey families in this evaluation</small><h2 id="scope-heading">A common experience for very different moments in life.</h2></div>
          </div>
          <div className={styles.journeyRunway}>
            {journeyFamilies.map(({ label, Icon, tone }) => (
              <div className={styles.journeyFamily} key={label}>
                <span className={styles[tone]}><Icon aria-hidden="true" /></span><strong>{label}</strong>
              </div>
            ))}
          </div>
          <div className={styles.truthLedger}>
            <div><Route aria-hidden="true" /><span><strong>Branching journey maps</strong><small>Mandatory and optional paths stay visible.</small></span></div>
            <div><FileCheck2 aria-hidden="true" /><span><strong>Documents and activity history</strong><small>Evidence and decisions remain attached to the journey.</small></span></div>
            <div><ShieldCheck aria-hidden="true" /><span><strong>Explicit synthetic boundary</strong><small>External agencies are simulated for evaluation and labelled as such.</small></span></div>
          </div>
        </div>
      </section>

      <section className={styles.accessSection} id="demo-access" aria-labelledby="login-heading">
        <div className={styles.accessLandscape} aria-hidden="true" />
        <div className={`${styles.sectionInner} ${styles.accessLayout}`} data-reveal>
          <div className={styles.accessCopy}>
            <p className={styles.kicker}><Sparkles aria-hidden="true" /> Evaluation access</p>
            <h2>Try the journey from the citizen’s side.</h2>
            <p>Continue as Ananya to start, pause and complete realistic life-event workflows with synthetic records.</p>
            <ul>
              <li><Check aria-hidden="true" /> 6 end-to-end journey families</li>
              <li><Check aria-hidden="true" /> Sample evidence for every document step</li>
              <li><Check aria-hidden="true" /> No registration or real government contact</li>
            </ul>
          </div>
          <section className={styles.loginCard} aria-labelledby="login-heading">
            <header className={styles.loginCardHeading}>
              <span className={styles.loginLock} aria-hidden="true"><LockKeyhole /></span>
              <div><p>Evaluation demo</p><h2 id="login-heading">Continue as Ananya</h2><span>The demo details are already filled in.</span></div>
            </header>
            <form onSubmit={login} aria-busy={pending}>
              <label htmlFor="evaluation-email">Email address</label>
              <div className={styles.loginField}><Mail aria-hidden="true" /><input id="evaluation-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" spellCheck={false} required /></div>
              <label htmlFor="evaluation-password">Password</label>
              <div className={styles.loginField}><LockKeyhole aria-hidden="true" /><input id="evaluation-password" name="password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /><button className={styles.passwordAction} type="button" onClick={() => setPasswordVisible((visible) => !visible)} aria-label={passwordVisible ? "Hide password" : "Show password"} aria-pressed={passwordVisible}>{passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}<span>{passwordVisible ? "Hide" : "Show"}</span></button></div>
              {error && <p className={styles.loginError} role="alert" ref={errorRef} tabIndex={-1}><AlertCircle aria-hidden="true" /><span>{error}</span></p>}
              <button type="submit" className={styles.submitButton} disabled={pending}>{pending ? <LoaderCircle className="service-spinner" aria-hidden="true" /> : null}<span>{pending ? "Opening the demo…" : "Open the guided demo"}</span>{pending ? null : <ArrowRight aria-hidden="true" />}</button>
            </form>
            <footer><ShieldCheck aria-hidden="true" /> Synthetic records only. No real service is contacted.</footer>
          </section>
        </div>
      </section>

      <footer className={styles.statementFooter}>
        <p>Public services should feel like one journey—even when many systems are involved.</p>
        <div><span>UMANG Journeys · Evaluation demo</span><a href="#top">Back to top <ArrowDown aria-hidden="true" /></a></div>
      </footer>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className={styles.loadingPage}><LoaderCircle className="service-spinner" aria-hidden="true" /><p>Loading secure access…</p></main>}><LoginForm /></Suspense>;
}
