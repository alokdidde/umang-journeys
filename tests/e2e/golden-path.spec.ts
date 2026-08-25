import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const email = "demo@umang.com";
const password = "demo1234";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /Life happens\. We guide you\.|One thing at a time\./ })).toBeVisible();
}

async function seedJourney(page: Page) {
  const created = await page.request.post("/api/journeys", {
    data: { facts: { "birth.city": "Hyderabad", "birth.state": "Telangana", "child.dateOfBirth": "2026-08-24", "birth.hospital": "Apollo Hospital" } },
  });
  expect(created.ok()).toBeTruthy();
  const journey = await created.json() as { id: string };
  return journey.id;
}

async function openDocumentAssistant(page: Page) {
  await page.goto("/documents");
  await page.getByText("Add a document", { exact: true }).click();
  const moreSamples = page.getByText("More sample documents", { exact: true });
  if (await moreSamples.isVisible()) await moreSamples.click();
}

test.describe.configure({ mode: "serial" });

test("only the seeded evaluation account can sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?returnTo=%2F$/);
  await expect(page.getByText("Use the demo email and password shared with you.")).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up|register/i })).toHaveCount(0);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("newborn journey persists, completes every sandbox integration, downloads a PDF, and resets", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await page.reload();
  await expect(page).toHaveScreenshot("home-1280.png", { fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: /Having a Baby/i }).click();
  await page.getByRole("button", { name: "Not sure" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Aarav’s journey" })).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  const locked = await page.request.post(`/api/journeys/${id}/nodes/child_health_record/submit`, { data: { idempotencyKey: "locked-service" } });
  expect(locked.status()).toBe(409);
  await page.getByRole("link", { name: /Review Birth Registration/i }).click();
  await page.getByRole("button", { name: /Submit Sandbox Registration/i }).click();
  await expect(page.getByText("Enter the child's name")).toBeVisible();
  await page.getByLabel("Child’s name").fill("Aarav Sharma");
  await page.getByRole("button", { name: /Ward 72 — Serilingampally/i }).click();
  await page.getByRole("button", { name: /Submit Sandbox Registration/i }).click();
  await expect(page.getByRole("heading", { name: /Birth registered/i })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Aarav Sharma")).toBeVisible();
  await expect(page.getByText(/BR-DEMO-2026-7429/)).toBeVisible();

  const services = [
    ["birth_certificate", "Generate certificate", "Sandbox birth certificate"],
    ["child_health_record", "Create health record", "Child health profile"],
    ["vaccination_timeline", "Build vaccination timeline", "Vaccination timeline"],
    ["child_identity", "Prepare identity checklist", "Newborn identity checklist"],
    ["eligible_benefits", "Match family benefits", "Family benefit matches"],
  ] as const;
  for (const [key, action, artifactTitle] of services) {
    await page.goto(`/journeys/${id}/services/${key}`);
    await page.getByRole("button", { name: action }).click();
    await expect(page.getByRole("progressbar")).toBeVisible();
    if (key === "birth_certificate") {
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "24");
      await page.reload();
      await expect(page.getByRole("progressbar")).toBeVisible();
    }
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
    await expect(page.locator(".service-artifact").getByRole("heading", { name: artifactTitle })).toBeVisible();
    await expect(page.locator(".service-timeline time")).toHaveCount(4);
    await expect(page.locator(".service-progress-card footer").getByText(/^Receipt SBX-/)).toBeVisible();
  }

  const pdf = await page.request.get(`/api/journeys/${id}/certificate`);
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  await page.goto(`/journeys/${id}`);
  await expect(page.getByText("Done", { exact: true })).toHaveCount(6);
  await page.reload();
  await expect(page.getByText("Done", { exact: true })).toHaveCount(6);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Nothing needs your attention." })).toBeVisible();
  await page.getByRole("link", { name: "View completed journeys" }).click();
  await expect(page).toHaveURL(/\/journeys#completed-journeys$/);
  await expect(page.getByRole("heading", { name: "Completed journeys" })).toBeVisible();
  await expect(page.locator("#completed-journeys").getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByText("Nothing needs your attention", { exact: true })).toBeVisible();

  await page.request.post("/api/demo/reset");
  expect((await page.request.get(`/api/journeys/${id}`)).status()).toBe(404);
});

test("home prioritises the saved child journey and keeps starting another one available", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);
  await page.request.post(`/api/journeys/${id}/nodes/birth_registration/submit`, {
    data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "home-registration" },
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "One thing at a time." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Birth certificate" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Aarav Sharma journey progress" })).toHaveAttribute("aria-valuenow", "17");
  await expect(page.getByRole("link", { name: "Start" })).toHaveAttribute("href", `/journeys/${id}/services/birth_certificate`);

  await page.getByText("Start another journey", { exact: true }).click();
  await page.getByRole("button", { name: /Another: Having a Baby/i }).click();
  await expect(page).toHaveURL(/\/intake$/);
  await page.request.post("/api/demo/reset");
});

test("journey CTA advances past a completed birth certificate", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);
  await page.request.post(`/api/journeys/${id}/nodes/birth_registration/submit`, {
    data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "cta-registration" },
  });
  for (let stage = 1; stage <= 4; stage += 1) {
    await page.request.post(`/api/journeys/${id}/nodes/birth_certificate/submit`, {
      data: { idempotencyKey: `cta-certificate-${stage}` },
    });
  }

  await page.goto(`/journeys/${id}`);
  await expect(page.getByRole("link", { name: "Continue with child health record" })).toHaveAttribute(
    "href",
    `/journeys/${id}/services/child_health_record`,
  );
  await page.request.post("/api/demo/reset");
});

test("every new life event starts the correct journey and opens its profile step", async ({ page }) => {
  await login(page);
  const scenarios = [
    {
      lifeEvent: /Moving Home/i,
      question: "Do you have a document for the new address?",
      journeyHeading: "New home in Hyderabad",
      profileLink: "Confirm your move",
      profileHeading: "Where are you moving?",
      templateId: "moving-home.india.v1",
      firstNode: "move_profile",
    },
    {
      lifeEvent: /Starting a Business/i,
      question: "Do you have a document for the principal place of business?",
      journeyHeading: "Ananya Design Studio",
      profileLink: "Confirm the business",
      profileHeading: "What business are you starting?",
      templateId: "business-setup.india.v1",
      firstNode: "business_profile",
    },
    {
      lifeEvent: /Retirement/i,
      question: "Do you have a provident-fund, NPS, or pension statement?",
      journeyHeading: "Ananya Sharma",
      profileLink: "Confirm your retirement",
      profileHeading: "What does retirement look like for you?",
      templateId: "retirement.india.v1",
      firstNode: "retirement_profile",
    },
  ] as const;

  for (const scenario of scenarios) {
    await page.request.post("/api/demo/reset");
    await page.goto("/");
    await page.getByRole("button", { name: scenario.lifeEvent }).click();
    await expect(page.getByRole("heading", { name: scenario.question })).toBeVisible();
    await page.getByRole("button", { name: "Not sure" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: scenario.journeyHeading })).toBeVisible();
    const id = page.url().split("/").at(-1)!;
    const saved = await (await page.request.get(`/api/journeys/${id}`)).json() as {
      projection: { templateId: string; nodes: Array<{ key: string; status: string }> };
    };
    expect(saved.projection.templateId).toBe(scenario.templateId);
    expect(saved.projection.nodes[0]).toMatchObject({ key: scenario.firstNode, status: "in_progress" });
    await page.getByRole("link", { name: scenario.profileLink, exact: true }).click();
    await expect(page.getByRole("heading", { name: scenario.profileHeading })).toBeVisible();
  }
  await page.request.post("/api/demo/reset");
});

test("a vehicle journey completes with real sample evidence while a baby journey keeps its own next action", async ({ page }) => {
  test.setTimeout(60_000);
  await login(page);
  await page.request.post("/api/demo/reset");
  const babyId = await seedJourney(page);
  await page.request.post(`/api/journeys/${babyId}/nodes/birth_registration/submit`, {
    data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "multi-registration" },
  });

  await page.goto("/");
  await page.getByText("Start another journey", { exact: true }).click();
  await page.getByRole("button", { name: /Another: Buying a Vehicle/i }).click();
  await expect(page.getByRole("heading", { name: "Is the registration certificate already in your name?" })).toBeVisible();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Tata Nexon" })).toBeVisible();
  const vehicleId = page.url().split("/").at(-1)!;

  await page.getByRole("link", { name: /Confirm vehicle details/i }).click();
  await page.getByRole("button", { name: "Continue to purchase details" }).click();
  await page.getByRole("button", { name: /Confirm vehicle and continue/i }).click();
  await expect(page.getByRole("heading", { name: "Tata Nexon" })).toBeVisible();

  await page.goto("/journeys");
  await expect(page.getByRole("heading", { name: "Tata Nexon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start" })).toHaveCount(2);

  await page.goto(`/journeys/${vehicleId}/services/ownership_transfer`);
  await expect(page.getByRole("heading", { name: "2 items needed before submission" })).toBeVisible();
  for (let index = 0; index < 2; index += 1) {
    await page.locator(".evidence-requirements article").nth(index).getByRole("button", { name: "Use sample evidence" }).click();
    await expect(page.locator(".evidence-requirements article").nth(index)).toHaveClass(/verified/);
  }
  const evidenceLink = page.locator(".evidence-requirements article").first().getByRole("link", { name: "Preview" });
  const evidenceResponse = await page.request.get(await evidenceLink.getAttribute("href") ?? "");
  expect(evidenceResponse.headers()["content-type"]).toBe("application/pdf");
  expect((await evidenceResponse.body()).subarray(0, 4).toString()).toBe("%PDF");
  await page.getByLabel("I authorise this evaluation-only submission").check();
  await page.getByRole("button", { name: "Submit transfer simulation" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });

  await page.goto(`/journeys/${vehicleId}/services/insurance_cover`);
  await page.getByRole("button", { name: "Use sample evidence" }).click();
  await page.getByLabel("I authorise this evaluation-only submission").check();
  await page.getByRole("button", { name: "Verify insurance cover" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });

  await page.goto(`/journeys/${vehicleId}/services/fastag_setup`);
  await page.getByLabel("I authorise this evaluation-only submission").check();
  await page.getByRole("button", { name: "Activate sandbox FASTag" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });

  await page.goto(`/journeys/${vehicleId}/services/compliance_calendar`);
  await page.getByLabel("I authorise this evaluation-only submission").check();
  await page.getByRole("button", { name: "Build compliance calendar" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Birth certificate" })).toBeVisible();
  await page.goto("/journeys");
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start" })).toHaveAttribute("href", `/journeys/${babyId}/services/birth_certificate`);
  await expect(page.locator("#completed-journeys").getByRole("heading", { name: "Tata Nexon" })).toBeVisible();
  await page.request.post("/api/demo/reset");
});

test("the document assistant creates a vehicle journey from an approved sample RC and replays safely", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  const babyId = await seedJourney(page);
  await page.request.post(`/api/journeys/${babyId}/nodes/birth_registration/submit`, {
    data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "document-rc-registration" },
  });

  await openDocumentAssistant(page);
  await page.getByRole("button", { name: "Registration certificate" }).click();
  await expect(page.getByRole("heading", { name: "Start a journey for Tata Nexon EV" })).toBeVisible();
  await expect(page.getByText("TS09EV4321", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Approve update/i }).click();
  await expect(page.getByText("The RC was attached and the vehicle journey is ready for review.")).toBeVisible();

  const journeysResponse = await page.request.get("/api/journeys");
  const journeysBody = await journeysResponse.json() as { journeys: Array<{ id: string; subject: { type: string }; nextAction: { nodeKey: string } | null }> };
  const vehicle = journeysBody.journeys.find((journey) => journey.subject.type === "vehicle");
  expect(vehicle?.nextAction?.nodeKey).toBe("vehicle_details");
  const full = await (await page.request.get(`/api/journeys/${vehicle!.id}`)).json() as { evidence: Array<{ type: string }> };
  expect(full.evidence).toEqual([expect.objectContaining({ type: "vehicle_rc" })]);
  await page.request.post("/api/demo/reset");
});

test("the document assistant records an approved vaccination receipt on the matching child", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  const babyId = await seedJourney(page);
  await page.request.post(`/api/journeys/${babyId}/nodes/birth_registration/submit`, {
    data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "document-vaccine-registration" },
  });

  await openDocumentAssistant(page);
  await page.getByRole("button", { name: "Vaccination receipt" }).click();
  await expect(page.getByRole("heading", { name: "Record BCG for Aarav Sharma" })).toBeVisible();
  await expect(page.getByText("Apollo Hospital", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Approve update/i }).click();
  await expect(page.getByText("The vaccination receipt was added and the child’s timeline was refreshed.")).toBeVisible();

  const saved = await (await page.request.get(`/api/journeys/${babyId}`)).json() as {
    facts: Record<string, string>;
    evidence: Array<{ type: string }>;
    serviceRuns: { vaccination_timeline?: { progress: number } };
    projection: { nodes: Array<{ key: string; status: string }> };
  };
  expect(saved.facts["vaccination.last.vaccine"]).toBe("BCG");
  expect(saved.evidence).toEqual([expect.objectContaining({ type: "vaccination_receipt" })]);
  expect(saved.serviceRuns.vaccination_timeline?.progress).toBe(100);
  expect(saved.projection.nodes.find((node) => node.key === "vaccination_timeline")?.status).toBe("completed");
  await page.request.post("/api/demo/reset");
});

test("a health policy starts and completes a safe Health & Insurance journey", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");

  await openDocumentAssistant(page);
  await page.getByRole("button", { name: "Health policy" }).click();
  await expect(page.getByRole("heading", { name: "Start a health journey for Ananya Sharma" })).toBeVisible();
  await expect(page.getByText("HLT-SBX-502781", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Approve update/i }).click();
  await expect(page.getByText("The health policy was added and the health journey is ready for review.")).toBeVisible();
  await page.getByRole("link", { name: "Open updated journey" }).click();
  await expect(page.getByRole("heading", { name: "Ananya Sharma" })).toBeVisible();
  const healthId = page.url().split("/").at(-1)!;

  await page.getByRole("link", { name: "Confirm your health profile" }).click();
  await expect(page.getByRole("heading", { name: "Who is this health plan for?" })).toBeVisible();
  const profileA11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(profileA11y.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  await page.getByRole("button", { name: "Continue to cover details" }).click();
  await page.getByRole("button", { name: "Confirm and continue" }).click();
  await expect(page.getByRole("heading", { name: "Ananya Sharma" })).toBeVisible();

  const services = [
    ["coverage_review", "Review my health cover", "Health coverage summary"],
    ["public_scheme_check", "Check possible scheme cover", "Public-scheme eligibility indication"],
    ["abha_records", "Prepare ABHA & records", "ABHA & health-record checklist"],
    ["cashless_readiness", "Build my cashless care pack", "Cashless care readiness pack"],
  ] as const;
  for (const [key, action, artifactTitle] of services) {
    await page.goto(`/journeys/${healthId}/services/${key}`);
    if (key === "coverage_review") {
      await expect(page.locator(".evidence-requirements article")).toHaveClass(/verified/);
      const previewHref = await page.getByRole("link", { name: "Preview" }).getAttribute("href");
      const policy = await page.request.get(previewHref ?? "");
      expect(policy.headers()["content-type"]).toBe("application/pdf");
      expect((await policy.body()).subarray(0, 4).toString()).toBe("%PDF");
    }
    await page.getByLabel("I authorise this evaluation-only submission").check();
    await page.getByRole("button", { name: action }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
    await expect(page.locator(".service-artifact").getByRole("heading", { name: artifactTitle })).toBeVisible();
  }
  const cashlessA11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(cashlessA11y.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);

  await page.goto(`/journeys/${healthId}`);
  await expect(page.getByText("Done", { exact: true })).toHaveCount(5);
  await expect(page.getByText("Your coverage pack is ready")).toBeVisible();
  await page.goto("/journeys");
  await expect(page.locator("#completed-journeys").getByRole("heading", { name: "Ananya Sharma" })).toBeVisible();
  await page.goto("/documents");
  await expect(page.getByText("Health insurance policy", { exact: true })).toBeVisible();
  await expect(page.getByText("Cashless care readiness pack", { exact: true })).toBeVisible();
  await page.request.post("/api/demo/reset");
});

test("moving home, business, and retirement each complete from evidence to archived outputs", async ({ page }) => {
  test.setTimeout(150_000);
  await login(page);
  const scenarios = [
    {
      sample: "Address proof",
      proposal: "Start a moving-home journey for this address",
      applied: "The residence evidence was added and the moving-home journey is ready for review.",
      profileLink: "Confirm your move",
      profileHeading: "Where are you moving?",
      profileSubmit: "Confirm move and continue",
      journeyHeading: "New home in Hyderabad",
      services: [
        ["residence_evidence", "Check address evidence", "Residence evidence summary"],
        ["aadhaar_address", "Prepare Aadhaar update", "Aadhaar address-update checklist"],
        ["voter_address", "Prepare voter update", "Voter Form 8 preparation"],
        ["move_completion_pack", "Build move checklist", "Move completion pack"],
      ],
      completed: "Your move pack is ready",
      activity: "Moving Home journey started",
    },
    {
      sample: "Business premises",
      proposal: "Start a business journey for Ananya Design Studio",
      applied: "The premises evidence was added and the business journey is ready for review.",
      profileLink: "Confirm the business",
      profileHeading: "What business are you starting?",
      profileSubmit: "Confirm business and continue",
      journeyHeading: "Ananya Design Studio",
      services: [
        ["business_premises", "Check premises evidence", "Business premises evidence summary"],
        ["udyam_readiness", "Prepare Udyam registration", "Udyam registration readiness"],
        ["gst_readiness", "Check GST registration path", "GST registration readiness result"],
        ["business_launch_pack", "Build business launch pack", "Business launch pack"],
      ],
      completed: "Your business launch pack is ready",
      activity: "Starting a Business journey started",
    },
    {
      sample: "Retirement statement",
      proposal: "Start a retirement journey for Ananya Sharma",
      applied: "The statement was added and the retirement journey is ready for review.",
      profileLink: "Confirm your retirement",
      profileHeading: "What does retirement look like for you?",
      profileSubmit: "Confirm retirement and continue",
      journeyHeading: "Ananya Sharma",
      services: [
        ["retirement_record_review", "Review retirement records", "Retirement record review"],
        ["pension_pathway", "Prepare pension pathways", "Pension pathway indications"],
        ["life_certificate_readiness", "Prepare life-certificate plan", "Life-certificate readiness plan"],
        ["retirement_pack", "Build retirement pack", "Retirement transition pack"],
      ],
      completed: "Your retirement pack is ready",
      activity: "Retirement journey started",
    },
  ] as const;

  for (const scenario of scenarios) {
    await page.request.post("/api/demo/reset");
    await openDocumentAssistant(page);
    await page.getByRole("button", { name: scenario.sample }).click();
    await expect(page.getByRole("heading", { name: scenario.proposal })).toBeVisible();
    await page.getByRole("button", { name: /Approve update/i }).click();
    await expect(page.getByText(scenario.applied)).toBeVisible();
    await page.getByRole("link", { name: "Open updated journey" }).click();
    await expect(page.getByRole("heading", { name: scenario.journeyHeading })).toBeVisible();
    const id = page.url().split("/").at(-1)!;

    await page.getByRole("link", { name: scenario.profileLink, exact: true }).click();
    await expect(page.getByRole("heading", { name: scenario.profileHeading })).toBeVisible();
    const profileA11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(profileA11y.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
    await page.getByRole("button", { name: "Continue to the next part" }).click();
    await page.getByRole("button", { name: scenario.profileSubmit }).click();
    await expect(page.getByRole("heading", { name: scenario.journeyHeading })).toBeVisible();

    for (const [key, action, artifactTitle] of scenario.services) {
      await page.goto(`/journeys/${id}/services/${key}`);
      await expect(page.getByRole("button", { name: action })).toBeVisible();
      const missingEvidence = page.getByRole("button", { name: "Use sample evidence" });
      if (await missingEvidence.isVisible()) await missingEvidence.click();
      await page.getByLabel("I authorise this evaluation-only submission").check();
      await page.getByRole("button", { name: action }).click();
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
      await expect(page.locator(".service-artifact").getByRole("heading", { name: artifactTitle })).toBeVisible();
      await expect(page.locator(".service-timeline time")).toHaveCount(4);
    }

    await page.goto(`/journeys/${id}`);
    await expect(page.getByText("Done", { exact: true })).toHaveCount(5);
    await expect(page.getByText(scenario.completed)).toBeVisible();
    await page.goto("/journeys");
    await expect(page.locator("#completed-journeys").getByRole("heading", { name: scenario.journeyHeading })).toBeVisible();
    await page.goto("/documents");
    await expect(page.getByText(scenario.services.at(-1)![2], { exact: true })).toBeVisible();
    await page.goto("/activity");
    await expect(page.getByText(scenario.activity, { exact: true })).toBeVisible();
  }
  await page.request.post("/api/demo/reset");
});

test("document tools create and enrich journeys while the library and activity ledger stay inspectable", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await page.goto("/documents");
  await expect(page.getByRole("link", { name: "Documents" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Your documents" })).toBeVisible();

  await page.getByText("Add a document", { exact: true }).click();
  await page.getByText("More sample documents", { exact: true }).click();
  await page.getByRole("button", { name: "Discharge summary" }).click();
  await expect(page.getByRole("heading", { name: "Start a journey for Mira Sharma" })).toBeVisible();
  await page.getByRole("button", { name: /Approve update/i }).click();
  await expect(page.getByText("The hospital record was added and the child journey was pre-filled for review.")).toBeVisible();
  await expect(page.getByText("Hospital discharge summary", { exact: true })).toBeVisible();
  const hospitalFileHref = await page.getByRole("link", { name: "View file" }).first().getAttribute("href");
  const hospitalFile = await page.request.get(hospitalFileHref ?? "");
  expect(hospitalFile.ok()).toBeTruthy();
  expect(hospitalFile.headers()["content-type"]).toBe("application/pdf");
  expect((await hospitalFile.body()).subarray(0, 4).toString()).toBe("%PDF");

  await page.getByRole("button", { name: "Use another document" }).click();
  await page.getByRole("button", { name: "Registration certificate" }).click();
  await expect(page.getByRole("heading", { name: "Start a journey for Tata Nexon EV" })).toBeVisible();
  await page.getByRole("button", { name: /Approve update/i }).click();
  await expect(page.getByText("The RC was attached and the vehicle journey is ready for review.")).toBeVisible();

  await page.getByRole("button", { name: "Use another document" }).click();
  await page.getByText("More sample documents", { exact: true }).click();
  await page.getByRole("button", { name: "Insurance policy" }).click();
  await expect(page.getByRole("heading", { name: "Add insurance for Tata Nexon EV" })).toBeVisible();
  await page.getByRole("button", { name: /Approve update/i }).click();
  await expect(page.getByText("The policy was added to the matching vehicle journey.")).toBeVisible();
  await expect(page.getByText("Motor insurance policy", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Activity", exact: true }).click();
  await expect(page.getByRole("link", { name: "Activity", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "What changed", exact: true })).toBeVisible();
  await expect(page.getByText("Document update approved")).toHaveCount(3);
  await expect(page.getByText("Having a Baby journey started")).toBeVisible();
  await expect(page.getByText("Buying a Vehicle journey started")).toBeVisible();

  await page.getByRole("link", { name: "Journeys", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your journeys" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mira Sharma" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tata Nexon EV" })).toBeVisible();
  await page.request.post("/api/demo/reset");
});

test("rejecting a document proposal leaves every journey unchanged", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await seedJourney(page);
  await openDocumentAssistant(page);
  await page.getByRole("button", { name: "Registration certificate" }).click();
  await expect(page.getByRole("heading", { name: "Start a journey for Tata Nexon EV" })).toBeVisible();
  await page.getByRole("button", { name: "Don’t update" }).click();
  await expect(page.getByText("No journey data was changed.")).toBeVisible();
  const body = await (await page.request.get("/api/journeys")).json() as { journeys: unknown[] };
  expect(body.journeys).toHaveLength(1);
  await page.request.post("/api/demo/reset");
});

test("an invalid uploaded document fails safely without mutating a journey", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await seedJourney(page);
  await openDocumentAssistant(page);
  await page.locator('.document-desk input[type="file"]').setInputFiles({
    name: "registration-certificate.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not really a PDF"),
  });
  await page.getByRole("button", { name: "Analyse document" }).click();
  await expect(page.getByText("The file contents do not match the selected file type.")).toBeVisible();
  await expect(page.getByText("No journey data was changed.")).toBeVisible();
  const body = await (await page.request.get("/api/journeys")).json() as { journeys: unknown[] };
  expect(body.journeys).toHaveLength(1);
  await page.request.post("/api/demo/reset");
});

test("authenticated workflow pages have no serious accessibility violations", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);
  await page.request.post(`/api/journeys/${id}/nodes/birth_registration/submit`, { data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "axe-registration" } });
  for (const route of ["/", "/journeys", "/documents", "/activity", "/intake", `/journeys/${id}`, `/journeys/${id}/birth-registration`, `/journeys/${id}/success`, `/journeys/${id}/services/child_health_record`]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? "")), route).toEqual([]);
  }
});

test("login, home, and a completed service reflow at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  let sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
  await login(page);
  sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);
  await page.request.post(`/api/journeys/${id}/nodes/birth_registration/submit`, { data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "mobile-registration" } });
  await page.goto(`/journeys/${id}/services/child_health_record`);
  await page.getByRole("button", { name: "Create health record" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
  sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
  for (const route of ["/documents", "/activity", "/journeys"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(sizes.scroll, route).toBeLessThanOrEqual(sizes.client);
  }
});
