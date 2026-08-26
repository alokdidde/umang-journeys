import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const email = "demo@umang.com";
const password = "demo1234";

function intakeFixture(statement: string) {
  const normalized = statement.toLowerCase();
  const base = { supported: true as const, resolver: "ai_gateway" as const };
  if (["need to get insurance for parents", "i need to get insurance for my parents", "i need health insurance for my parents"].includes(normalized)) return { ...base, lifeEvent: { value: "managing_health_cover", confidence: 0.97 }, facts: [{ key: "health.coverageFor", value: "dependent", confidence: 0.96, source: "user_statement" }, { key: "health.dependentRelationship", value: "parent", confidence: 0.96, source: "user_statement" }], clarification: { key: "health.subjects", question: "Who needs health cover?", choices: ["both", "mother", "father"] } };
  if (normalized === "i want to understand my health insurance and prepare for cashless care in hyderabad.") return { ...base, lifeEvent: { value: "managing_health_cover", confidence: 0.97 }, facts: [{ key: "person.city", value: "Hyderabad", confidence: 0.9, source: "user_statement" }, { key: "person.state", value: "Telangana", confidence: 0.9, source: "derived_from_city" }], clarification: { key: "health.currentCover", question: "Do you have a health policy or government scheme card?", choices: ["yes", "not_sure", "no"] } };
  if (normalized === "i bought a used tata nexon in hyderabad.") return { ...base, lifeEvent: { value: "buying_a_vehicle", confidence: 0.97 }, facts: [{ key: "vehicle.purchaseType", value: "used", confidence: 0.92, source: "user_statement" }, { key: "vehicle.city", value: "Hyderabad", confidence: 0.96, source: "user_statement" }, { key: "vehicle.state", value: "Telangana", confidence: 0.95, source: "derived_from_city" }, { key: "vehicle.makeModel", value: "Tata Nexon", confidence: 0.92, source: "user_statement" }], clarification: { key: "vehicle.ownershipTransferred", question: "Is the registration certificate already in your name?", choices: ["yes", "not_sure", "no"] } };
  if (normalized === "we are moving to a rented home in hyderabad next month.") return { ...base, lifeEvent: { value: "moving_home", confidence: 0.97 }, facts: [{ key: "move.newCity", value: "Hyderabad", confidence: 0.94, source: "user_statement" }, { key: "move.newState", value: "Telangana", confidence: 0.95, source: "derived_from_city" }, { key: "move.occupancy", value: "rented", confidence: 0.9, source: "user_statement" }], clarification: { key: "move.hasAddressEvidence", question: "Do you have a document for the new address?", choices: ["yes", "not_sure", "no"] } };
  if (normalized === "i am starting a design business from a rented office in hyderabad.") return { ...base, lifeEvent: { value: "starting_a_business", confidence: 0.97 }, facts: [{ key: "business.activity", value: "Design services", confidence: 0.9, source: "user_statement" }, { key: "business.city", value: "Hyderabad", confidence: 0.94, source: "user_statement" }, { key: "business.state", value: "Telangana", confidence: 0.95, source: "derived_from_city" }], clarification: { key: "business.hasPremisesProof", question: "Do you have a document for the principal place of business?", choices: ["yes", "not_sure", "no"] } };
  if (normalized === "i retire from private employment next month and have an epfo account.") return { ...base, lifeEvent: { value: "retirement", confidence: 0.97 }, facts: [{ key: "retirement.employmentSector", value: "private", confidence: 0.9, source: "user_statement" }, { key: "retirement.accountType", value: "epfo", confidence: 0.9, source: "user_statement" }], clarification: { key: "retirement.hasAccountStatement", question: "Do you have a provident-fund, NPS, or pension statement?", choices: ["yes", "not_sure", "no"] } };
  if (normalized === "we had a baby yesterday at apollo hospital in hyderabad.") return { ...base, lifeEvent: { value: "having_a_baby", confidence: 0.97 }, facts: [{ key: "birth.setting", value: "hospital", confidence: 0.94, source: "user_statement" }, { key: "birth.city", value: "Hyderabad", confidence: 0.98, source: "user_statement" }, { key: "birth.state", value: "Telangana", confidence: 0.95, source: "derived_from_city" }, { key: "child.dateOfBirth", value: "2026-08-24", confidence: 0.9, source: "relative_date_parse" }], clarification: { key: "birth.registeredByHospital", question: "Has the hospital already registered the birth?", choices: ["yes", "not_sure", "no"] } };
  throw new Error(`Missing exact AI fixture for statement: ${statement}`);
}

async function mockIntakeAI(page: Page) {
  await page.route("**/api/intake/resolve", async (route) => {
    const { statement } = route.request().postDataJSON() as { statement: string };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(intakeFixture(statement)) });
  });
}

async function login(page: Page, options: { mockIntake?: boolean } = {}) {
  if (options.mockIntake !== false) await mockIntakeAI(page);
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Open the guided demo" }).click();
  await expect(page.getByRole("heading", { name: /Continue where you left off|What do you need help with\?|Your journeys are up to date/ })).toBeVisible();
}

async function seedJourney(page: Page) {
  const created = await page.request.post("/api/journeys", {
    data: { facts: { "birth.city": "Hyderabad", "birth.state": "Telangana", "child.dateOfBirth": "2026-08-24", "birth.hospital": "Apollo Hospital" } },
  });
  expect(created.ok()).toBeTruthy();
  const journey = await created.json() as { id: string };
  return journey.id;
}

async function activateBranch(page: Page, journeyId: string, branchKey: string) {
  const response = await page.request.post(`/api/journeys/${journeyId}/branches/${branchKey}`);
  expect(response.ok()).toBeTruthy();
}

async function expectJourneyNodesComplete(page: Page, journeyId: string, expectedCount: number) {
  const saved = await (await page.request.get(`/api/journeys/${journeyId}`)).json() as {
    projection: { nodes: Array<{ status: string; contributesToCompletion: boolean }> };
    status: string;
  };
  const completedWork = saved.projection.nodes.filter((node) => node.contributesToCompletion && node.status === "completed");
  expect(completedWork).toHaveLength(expectedCount);
  expect(saved.status).toBe("completed");
}

async function openDocumentAssistant(page: Page) {
  await page.goto("/documents");
  await page.getByText("Add a document", { exact: true }).click();
  const moreSamples = page.getByText("More sample documents", { exact: true });
  if (await moreSamples.isVisible()) await moreSamples.click();
}

test.describe.configure({ mode: "default" });

test("authentication protects the app, logs out completely, and supports signing in again", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?returnTo=%2F$/);
  await expect(page.getByRole("heading", { name: "Find the government services you need" })).toBeVisible();
  await expect(page.getByText("The demo details are already filled in.")).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveValue(email);
  const passwordInput = page.getByLabel("Password", { exact: true });
  await expect(passwordInput).toHaveValue(password);
  await expect(passwordInput).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(passwordInput).toHaveAttribute("type", "password");
  await expect(page.getByRole("link", { name: /sign up|register/i })).toHaveCount(0);
  const loginA11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(loginA11y.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);

  for (const route of ["/journeys", "/documents", "/activity", "/intake"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    expect(new URL(page.url()).searchParams.get("returnTo")).toBe(route);
  }
  expect((await page.request.get("/api/hub")).status()).toBe(401);
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);

  await page.goto("/login?returnTo=%2F%2Fevil.example");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Open the guided demo" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();
  expect((await page.context().cookies()).find((cookie) => cookie.name === "umang_session")).toBeUndefined();
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Open the guided demo" }).click();
  await expect(page).toHaveURL(/\/$/);

  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === "umang_session");
  expect(sessionCookie).toMatchObject({ httpOnly: true, sameSite: "Lax", secure: false, path: "/" });
  expect(sessionCookie?.expires ?? 0).toBeGreaterThan(Date.now() / 1000);
  expect((await page.request.get("/api/hub")).status()).toBe(200);
  expect((await page.request.get("/api/auth/session")).status()).toBe(200);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/documents");
  await page.getByRole("button", { name: "Sign out Ananya Sharma" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).find((cookie) => cookie.name === "umang_session")).toBeUndefined();
  expect((await page.request.get("/api/hub")).status()).toBe(401);
  expect((await page.request.get("/api/auth/session")).status()).toBe(401);
  expect((await page.request.post("/api/auth/logout")).status()).toBe(200);

  await page.goBack();
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
  await page.goto("/journeys?view=completed");
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/journeys?view=completed");
  await page.getByRole("button", { name: "Open the guided demo" }).click();
  await expect(page).toHaveURL(/\/journeys\?view=completed$/);
  expect((await page.request.get("/api/hub")).status()).toBe(200);
});

test("newborn journey persists, completes every synthetic agency review, downloads a PDF, and resets", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await page.reload();
  await expect(page).toHaveScreenshot("home-1280.png", { fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: /Having a Baby/i }).click();
  await expect(page).toHaveURL(/\/intake\?journey=baby$/);
  await page.getByLabel("Tell us about the birth").fill("We had a baby yesterday at Apollo Hospital in Hyderabad.");
  await page.getByRole("button", { name: "Use this description" }).click();
  await expect(page.getByRole("heading", { name: "Has the hospital already registered the birth?" })).toBeVisible();
  await page.getByRole("button", { name: "Not sure" }).click();
  await page.getByRole("button", { name: "Create baby journey" }).click();
  await expect(page.getByRole("heading", { name: "Aarav’s journey" })).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  const locked = await page.request.post(`/api/journeys/${id}/nodes/child_health_record/submit`, { data: { idempotencyKey: "locked-service" } });
  expect(locked.status()).toBe(409);
  await page.getByRole("link", { name: /Review Birth Registration/i }).click();
  await page.getByLabel("Child’s name").fill("Aarav Sharma");
  await page.getByRole("button", { name: /Ward 72 — Serilingampally/i }).click();
  await page.getByRole("button", { name: /Send birth registration for AI review/i }).click();
  await expect(page.getByRole("heading", { name: /Birth registered/i })).toBeVisible();

  await page.reload();
  await expect(page.getByText("Aarav Sharma")).toBeVisible();
  await expect(page.getByText("SYN-E2E-BIRTH-REGISTRATION")).toBeVisible();

  const services = [
    ["birth_certificate", "Generate certificate", "Birth certificate"],
    ["child_health_record", "Create health record", "Mother and child record"],
    ["vaccination_timeline", "Build vaccination timeline", "Vaccination timeline"],
    ["child_identity", "Prepare identity checklist", "Child Aadhaar"],
    ["eligible_benefits", "Match family benefits", "Eligible benefits"],
  ] as const;
  await activateBranch(page, id, "child_identity");
  await activateBranch(page, id, "family_support");
  for (const [key, action, artifactTitle] of services) {
    await page.goto(`/journeys/${id}/services/${key}`);
    await page.getByLabel("I authorise an AI review of this synthetic case").check();
    await page.getByRole("button", { name: action }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
    await expect(page.locator(".service-artifact").getByRole("heading", { name: `Synthetic ${artifactTitle} result` })).toBeVisible();
    await expect(page.locator(".service-timeline time")).toHaveCount(1);
    await expect(page.locator(".service-progress-card footer").getByText(/^Synthetic reference SYN-E2E-/)).toBeVisible();
    const serviceRecord = await page.request.get(`/api/journeys/${id}/services/${key}/download`);
    expect(serviceRecord.ok()).toBeTruthy();
    expect(serviceRecord.headers()["content-type"]).toBe("application/pdf");
  }

  const pdf = await page.request.get(`/api/journeys/${id}/certificate`);
  expect(pdf.ok()).toBeTruthy();
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

  await page.goto(`/journeys/${id}`);
  await expectJourneyNodesComplete(page, id, 6);
  await expect(page.getByText("All services in this journey are complete")).toBeVisible();
  await page.reload();
  await expectJourneyNodesComplete(page, id, 6);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Continue where you left off" })).toBeVisible();
  const nextForYou = page.getByRole("region", { name: "Next for you" });
  await expect(nextForYou.getByRole("heading", { name: "Hospital birth report" })).toBeVisible();
  await expect(nextForYou.getByRole("progressbar", { name: "Aarav Sharma journey progress" })).toHaveAttribute("aria-valuenow", "100");
  await page.getByRole("link", { name: /My journeys/i }).click();
  await expect(page).toHaveURL(/\/journeys$/);
  await expect(page.getByRole("heading", { name: "Completed journeys" })).toBeVisible();
  await expect(page.locator("#completed-journeys").getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByText("Hospital birth report", { exact: true })).toBeVisible();

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
  await expect(page.getByRole("heading", { name: "Continue where you left off" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Birth certificate" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Aarav Sharma journey progress" })).toHaveAttribute("aria-valuenow", "25");
  await expect(page.getByRole("link", { name: "Start" })).toHaveAttribute("href", `/journeys/${id}/services/birth_certificate`);

  await page.getByText("Start another journey", { exact: true }).click();
  await page.getByRole("button", { name: /Another: Having a Baby/i }).click();
  await expect(page).toHaveURL(/\/intake\?journey=baby$/);
  await expect(page.getByRole("heading", { name: "Tell us about the baby’s birth" })).toBeVisible();
  await page.request.post("/api/demo/reset");
});

test("Show my steps accepts either a description or a document with context", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await page.reload();

  await page.getByLabel("Tell us what happened").fill("need to get insurance for parents");
  await page.getByRole("button", { name: "Show my steps" }).click();
  await expect(page).toHaveURL(/\/intake\?analyse=1$/);
  await expect(page.getByRole("region", { name: "Health & Insurance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who needs health cover?" })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("heading", { name: "What do you need help with?" })).toBeVisible();
  const created = await page.request.post("/api/journeys", {
    data: {
      templateId: "vehicle-purchase.india.v1",
      facts: { "vehicle.registrationNumber": "TS09EV4321", "vehicle.makeModel": "Tata Nexon EV" },
    },
  });
  const { id } = await created.json() as { id: string };
  let analysisPayload = "";

  await page.route("**/api/assistant/documents", async (route) => {
    analysisPayload = route.request().postData() ?? "";
    await route.fulfill({
      contentType: "application/json",
      status: 201,
      body: JSON.stringify({
        document: {
          id: "home-composer-document",
          status: "proposed",
          fileName: "registration-certificate.pdf",
          mimeType: "application/pdf",
          size: 28,
          source: "user_upload",
          analysis: { kind: "vehicle_rc", confidence: 0.97, fields: { registrationNumber: "TS09EV4321", makeModel: "Tata Nexon EV" } },
          proposal: {
            action: "update_vehicle_journey",
            canApply: true,
            targetJourneyId: id,
            title: "Update Tata Nexon EV",
            description: "Attach this RC and update the matching vehicle details.",
            toolName: "updateVehicleFromRC",
            changes: [{ label: "Registration number", value: "TS09EV4321" }, { label: "Vehicle", value: "Tata Nexon EV" }],
          },
          appliedJourneyId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });
  await page.route("**/api/assistant/documents/home-composer-document/decision", async (route) => {
    await route.fulfill({ contentType: "application/json", status: 200, body: JSON.stringify({ journeyId: id, message: "The RC was attached." }) });
  });

  await page.getByLabel("Tell us what happened").fill("This is the registration certificate for the car I just bought.");
  await page.locator('.journey-composer input[type="file"]').setInputFiles({
    name: "registration-certificate.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\n%%EOF"),
  });
  await page.getByRole("button", { name: "Show my steps" }).click();
  await expect(page.getByRole("heading", { name: "Update Tata Nexon EV" })).toBeVisible();
  expect(analysisPayload).toContain("This is the registration certificate for the car I just bought.");
  await page.getByRole("button", { name: "Approve and show my steps" }).click();
  await expect(page).toHaveURL(new RegExp(`/journeys/${id}$`));
  await page.request.post("/api/demo/reset");
});

test("a request for both parents creates one health journey for each parent", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await page.goto("/");

  await page.getByLabel("Tell us what happened").fill("I need to get insurance for my parents");
  await page.getByRole("button", { name: "Show my steps" }).click();

  await expect(page.getByRole("heading", { name: "Who needs health cover?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Both parents" })).toBeVisible();
  await expect(page.getByRole("button", { name: "My mother" })).toBeVisible();
  await expect(page.getByRole("button", { name: "My father" })).toBeVisible();

  await page.getByRole("button", { name: "Both parents" }).click();
  await page.getByRole("button", { name: "Create health journey" }).click();
  await expect(page).toHaveURL(/\/journeys$/);

  const response = await page.request.get("/api/journeys");
  expect(response.ok()).toBeTruthy();
  const { journeys } = await response.json() as { journeys: Array<{ id: string; subject: { displayName: string }; templateId: string }> };
  const parentJourneys = journeys.filter((journey) => journey.templateId === "health-insurance.india.v1");
  expect(parentJourneys.map((journey) => journey.subject.displayName).sort()).toEqual(["Father", "Mother"]);

  for (const journey of parentJourneys) {
    const detailResponse = await page.request.get(`/api/journeys/${journey.id}`);
    const detail = await detailResponse.json() as { subject: { displayName: string }; facts: Record<string, string> };
    expect(detail.facts["health.coverageFor"]).toBe("dependent");
    expect(detail.facts["health.dependentRelationship"]).toBe(detail.subject.displayName.toLowerCase());

    await page.goto(`/journeys/${journey.id}/health-profile`);
    await expect(page.getByLabel("Full name")).toHaveValue(detail.subject.displayName);
    await expect(page.getByRole("heading", { name: "About the person" })).toBeVisible();
  }

  await page.request.post("/api/demo/reset");
});

test("failed AI language analysis is visible and retryable without creating a guessed journey", async ({ page }) => {
  await login(page, { mockIntake: false });
  await page.request.post("/api/demo/reset");
  let shouldFail = true;
  await page.route("**/api/intake/resolve", async (route) => {
    if (shouldFail) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "AI_INTAKE_FAILED", message: "AI could not analyse that request. Please try again." }),
      });
      return;
    }
    const { statement } = route.request().postDataJSON() as { statement: string };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(intakeFixture(statement)) });
  });

  await page.goto("/");
  await page.getByLabel("Tell us what happened").fill("I need health insurance for my parents");
  await page.getByRole("button", { name: "Show my steps" }).click();

  await expect(page.getByText("AI analysis did not finish", { exact: true })).toBeVisible();
  await expect(page.getByText("AI could not analyse that request. Please try again.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Who needs health cover?" })).toHaveCount(0);
  expect((await page.request.get("/api/journeys")).ok()).toBeTruthy();
  const beforeRetry = await (await page.request.get("/api/journeys")).json() as { journeys: unknown[] };
  expect(beforeRetry.journeys).toHaveLength(0);

  shouldFail = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "Who needs health cover?" })).toBeVisible();
  await page.request.post("/api/demo/reset");
});

test("opening intake directly starts empty and does not submit to AI", async ({ page }) => {
  await login(page, { mockIntake: false });
  await page.request.post("/api/demo/reset");
  let resolveCalls = 0;
  await page.route("**/api/intake/resolve", async (route) => {
    resolveCalls += 1;
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "AI_INTAKE_FAILED", message: "AI could not analyse that request. Please try again." }),
    });
  });

  await page.goto("/intake");
  const statement = page.locator("main").getByLabel("Tell us what happened");
  await expect(statement).toHaveCount(1);
  await expect(statement).toHaveValue("");
  await expect(page.getByText("AI analysis did not finish", { exact: true })).toHaveCount(0);
  await page.waitForTimeout(250);
  expect(resolveCalls).toBe(0);
});

test("the journey composer shows one rounded focus treatment", async ({ page }) => {
  await login(page, { mockIntake: false });
  await page.goto("/");

  const statement = page.getByLabel("Tell us what happened");
  await statement.focus();

  await expect(statement).toHaveCSS("outline-style", "none");
  const composer = statement.locator('xpath=ancestor::*[@data-slot="input-group"]');
  await expect(composer).toHaveCSS("border-radius", "16px");
  await expect(composer).not.toHaveCSS("box-shadow", "none");
});

test("the vehicle intake starts in context and offers a reviewable sample RC", async ({ page }) => {
  await login(page, { mockIntake: false });
  await page.request.post("/api/demo/reset");
  let resolveCalls = 0;
  await page.route("**/api/intake/resolve", async (route) => {
    resolveCalls += 1;
    await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Unexpected analysis" }) });
  });

  await page.goto("/");
  await page.getByRole("button", { name: /Buying a Vehicle/i }).click();
  await expect(page).toHaveURL(/\/intake\?journey=vehicle$/);
  await expect(page.getByRole("heading", { name: "Tell us about the vehicle you bought" })).toBeVisible();
  await expect(page.getByLabel("Tell us about the vehicle purchase")).toHaveValue("");
  expect(resolveCalls).toBe(0);

  await page.getByRole("button", { name: "Try a sample registration certificate" }).click();
  await expect(page.getByRole("heading", { name: "Start a journey for Tata Nexon EV" })).toBeVisible();
  await expect(page.getByText("TS09EV4321", { exact: true })).toBeVisible();
  await expect(page.getByText("Nothing changes until you approve.", { exact: true })).toBeVisible();
  expect(resolveCalls).toBe(0);

  const a11y = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(a11y.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("button", { name: "Approve and show my steps" })).toBeVisible();
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
      data: { idempotencyKey: `cta-certificate-${stage}`, consent: true },
    });
  }

  await page.goto(`/journeys/${id}`);
  await expect(page.getByRole("link", { name: "Continue with mother and child record" })).toHaveAttribute(
    "href",
    `/journeys/${id}/services/child_health_record`,
  );
  await page.request.post("/api/demo/reset");
});

test("every journey exposes its dependency map and persists an optional branch choice", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);

  await page.goto(`/journeys/${id}`);
  await page.getByRole("button", { name: "View journey map" }).click();
  const map = page.getByRole("dialog", { name: "Your complete journey map" });
  await expect(map).toBeVisible();
  expect(await map.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(900);
  await expect(map.getByRole("heading", { name: "Birth records", exact: true })).toBeVisible();
  await expect(map.getByRole("heading", { name: "Child identity" })).toHaveCount(0);
  await map.getByRole("button", { name: "Entire journey" }).click();
  await expect(map.getByRole("heading", { name: "Child identity" }).first()).toBeVisible();
  await expect(map.locator(".journey-map-canvas .journey-map-node-icon svg")).toHaveCount(17);
  await expect(map).toHaveScreenshot("journey-map-desktop.png", { animations: "disabled" });
  await map.getByRole("button", { name: "Add Child identity" }).click();
  await expect(map.getByText("Added", { exact: true }).first()).toBeVisible();

  const saved = await (await page.request.get(`/api/journeys/${id}`)).json() as { projection: { branches: Array<{ key: string; active: boolean }> } };
  expect(saved.projection.branches.find((branch) => branch.key === "child_identity")?.active).toBe(true);
  const mapA11y = await new AxeBuilder({ page }).include(".journey-map-drawer").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(mapA11y.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  await map.getByRole("button", { name: "Close journey map" }).click();
  await expect(map).toBeHidden();

  const otherMaps = [
    ["vehicle-purchase.india.v1", "Toll access"],
    ["health-insurance.india.v1", "Public schemes"],
    ["moving-home.india.v1", "Identity updates"],
    ["business-setup.india.v1", "Formal registrations"],
    ["retirement.india.v1", "Ongoing pension duties"],
  ] as const;
  for (const [templateId, optionalBranch] of otherMaps) {
    const created = await page.request.post("/api/journeys", { data: { templateId, facts: {} } });
    expect(created.ok()).toBeTruthy();
    const journey = await created.json() as { id: string };
    await page.goto(`/journeys/${journey.id}?view=map`);
    const otherMap = page.getByRole("dialog", { name: "Your complete journey map" });
    await expect(otherMap).toBeVisible();
    await otherMap.getByRole("button", { name: "Entire journey" }).click();
    await expect(page.locator(".journey-map-canvas").getByRole("heading", { name: optionalBranch, exact: true })).toBeVisible();
  }

  const conditional = await page.request.post("/api/journeys", { data: { templateId: "vehicle-purchase.india.v1", facts: { "vehicle.acquisitionRoute": "sale", "vehicle.transferScope": "interstate" } } });
  const conditionalJourney = await conditional.json() as { id: string };
  await page.goto(`/journeys/${conditionalJourney.id}?view=map`);
  await page.getByRole("button", { name: "Entire journey" }).click();
  await expect(page.locator('.journey-map-lane[aria-label="Used-vehicle transfer branch"]')).toHaveClass(/applicability-applicable/);
  await expect(page.locator('.journey-map-lane[aria-label="New-vehicle registration branch"]')).toHaveClass(/applicability-not_applicable/);
  await expect(page.locator('.journey-map-lane[aria-label="Interstate requirements branch"]')).toHaveClass(/applicability-applicable/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/journeys/${id}?view=map`);
  await expect(page.locator(".journey-map-mobile-list")).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Your complete journey map" })).toHaveScreenshot("journey-map-mobile.png", { animations: "disabled" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.request.post("/api/demo/reset");
});

test("every new life event starts the correct journey and opens its profile step", async ({ page }) => {
  await login(page);
  const scenarios = [
    {
      lifeEvent: /Moving Home/i,
      journeyKey: "home",
      promptLabel: "Tell us about the move",
      statement: "We are moving to a rented home in Hyderabad next month.",
      question: "Do you have a document for the new address?",
      journeyHeading: "New home in Hyderabad",
      profileLink: "Confirm your move",
      profileHeading: "Where are you moving?",
      templateId: "moving-home.india.v1",
      firstNode: "move_profile",
    },
    {
      lifeEvent: /Starting a Business/i,
      journeyKey: "business",
      promptLabel: "Tell us about the business",
      statement: "I am starting a design business from a rented office in Hyderabad.",
      question: "Do you have a document for the principal place of business?",
      journeyHeading: "Ananya Design Studio",
      profileLink: "Confirm the business",
      profileHeading: "What business are you starting?",
      templateId: "business-setup.india.v1",
      firstNode: "business_profile",
    },
    {
      lifeEvent: /Retirement/i,
      journeyKey: "retirement",
      promptLabel: "Tell us about the retirement",
      statement: "I retire from private employment next month and have an EPFO account.",
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
    await expect(page).toHaveURL(new RegExp(`/intake\\?journey=${scenario.journeyKey}$`));
    const statement = page.getByLabel(scenario.promptLabel);
    await expect(statement).toBeVisible();
    await statement.fill(scenario.statement);
    await expect(statement).toHaveValue(scenario.statement);
    await page.getByRole("button", { name: "Use this description" }).click();
    await expect(page.getByRole("heading", { name: scenario.question })).toBeVisible();
    await page.getByRole("button", { name: "Not sure" }).click();
    await page.getByRole("button", { name: /^Create .+ journey$/ }).click();
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
  await page.getByLabel("Tell us about the vehicle purchase").fill("I bought a used Tata Nexon in Hyderabad.");
  await page.getByRole("button", { name: "Use this description" }).click();
  await expect(page.getByRole("heading", { name: "Is the registration certificate already in your name?" })).toBeVisible();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "Create vehicle journey" }).click();
  await expect(page).toHaveURL(/\/journeys\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Tata Nexon" })).toBeVisible();
  const vehicleId = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.getByRole("link", { name: /Confirm vehicle details/i }).click();
  await page.getByRole("button", { name: "Continue to purchase details" }).click();
  await page.getByRole("button", { name: /Confirm vehicle and continue/i }).click();
  await expect(page.getByRole("heading", { name: "Tata Nexon" })).toBeVisible();

  await page.goto("/journeys");
  await expect(page.getByRole("heading", { name: "Tata Nexon" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start" })).toHaveCount(2);

  await page.goto(`/journeys/${vehicleId}/services/ownership_transfer`);
  await expect(page.getByRole("heading", { name: "2 items needed before review" })).toBeVisible();
  for (let index = 0; index < 2; index += 1) {
    await page.locator(".evidence-requirements article").nth(index).getByRole("button", { name: "Use sample evidence" }).click();
    await expect(page.locator(".evidence-requirements article").nth(index)).toHaveClass(/verified/);
  }
  const evidenceLink = page.locator(".evidence-requirements article").first().getByRole("link", { name: "Preview" });
  const evidenceResponse = await page.request.get(await evidenceLink.getAttribute("href") ?? "");
  expect(evidenceResponse.headers()["content-type"]).toBe("application/pdf");
  expect((await evidenceResponse.body()).subarray(0, 4).toString()).toBe("%PDF");
  await page.getByLabel("I authorise an AI review of this synthetic case").check();
  await page.getByRole("button", { name: "Send transfer for AI review" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });

  await page.goto(`/journeys/${vehicleId}/services/insurance_cover`);
  await page.getByRole("button", { name: "Use sample evidence" }).click();
  await page.getByLabel("I authorise an AI review of this synthetic case").check();
  await page.getByRole("button", { name: "Verify insurance cover" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });

  await activateBranch(page, vehicleId, "tolling");
  await page.goto(`/journeys/${vehicleId}/services/fastag_setup`);
  await page.getByLabel("I authorise an AI review of this synthetic case").check();
  await page.getByRole("button", { name: "Review FASTag setup" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });

  await page.goto(`/journeys/${vehicleId}/services/compliance_calendar`);
  await page.getByLabel("I authorise an AI review of this synthetic case").check();
  await page.getByRole("button", { name: "Build compliance calendar" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });

  await page.goto("/activity");
  await expect(page.getByText("Match policy and RC owner", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.getByText("Match policy and RC owner", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Birth certificate" })).toBeVisible();
  await page.goto("/journeys");
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByLabel("In progress").getByRole("link", { name: "Start" })).toHaveAttribute("href", `/journeys/${babyId}/services/birth_certificate`);
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
  await expect(page.locator('input[value="TS09EV4321"]')).toBeVisible();
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
  await expect(page.locator('input[value="Apollo Hospital"]')).toBeVisible();
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
  await expect(page.locator('input[value="HLT-SBX-502781"]')).toBeVisible();
  await page.getByRole("button", { name: /Approve update/i }).click();
  await expect(page.getByText("The health policy was added and the health journey is ready for review.")).toBeVisible();
  await page.getByRole("link", { name: "Open updated journey" }).click();
  await expect(page.getByRole("heading", { name: "Ananya Sharma" })).toBeVisible();
  const healthId = page.url().split("/").at(-1)!;

  await page.getByRole("link", { name: "Confirm health profile" }).click();
  await expect(page.getByRole("heading", { name: "Who is this health plan for?" })).toBeVisible();
  const profileA11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(profileA11y.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  await page.getByRole("button", { name: "Continue to cover details" }).click();
  await page.getByRole("button", { name: "Confirm and continue" }).click();
  await expect(page.getByRole("heading", { name: "Ananya Sharma" })).toBeVisible();

  await activateBranch(page, healthId, "public_cover");
  await activateBranch(page, healthId, "digital_records");

  const services = [
    ["coverage_review", "Review my health cover", "Health coverage summary"],
    ["public_scheme_check", "Check possible scheme cover", "Public-scheme eligibility indication"],
    ["abha_records", "Prepare ABHA & records", "ABHA & health-record checklist"],
    ["cashless_readiness", "Build my cashless care pack", "Cashless care readiness pack"],
  ] as const;
  for (const [key, action] of services) {
    await page.goto(`/journeys/${healthId}/services/${key}`);
    if (key === "coverage_review") {
      await expect(page.locator(".evidence-requirements article")).toHaveClass(/verified/);
      const previewHref = await page.getByRole("link", { name: "Preview" }).getAttribute("href");
      const policy = await page.request.get(previewHref ?? "");
      expect(policy.headers()["content-type"]).toBe("application/pdf");
      expect((await policy.body()).subarray(0, 4).toString()).toBe("%PDF");
    }
    await page.getByLabel("I authorise an AI review of this synthetic case").check();
    await page.getByRole("button", { name: action }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
    await expect(page.locator(".service-artifact").getByRole("heading", { name: /^Synthetic .+ result$/ })).toBeVisible();
  }
  const cashlessA11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(cashlessA11y.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);

  await page.goto(`/journeys/${healthId}`);
  await expectJourneyNodesComplete(page, healthId, 5);
  await expect(page.getByText("Coverage pack is ready")).toBeVisible();
  await page.goto("/journeys");
  await expect(page.locator("#completed-journeys").getByRole("heading", { name: "Ananya Sharma" })).toBeVisible();
  await page.goto("/documents");
  await expect(page.getByText("Health insurance policy", { exact: true })).toBeVisible();
  await expect(page.getByText("Synthetic Prepare for cashless care result", { exact: true })).toBeVisible();
  await page.request.post("/api/demo/reset");
});

const extendedJourneyScenarios = [
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
      optionalBranch: "identity_updates",
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
      optionalBranch: "formal_registrations",
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
      optionalBranch: "ongoing_pension",
    },
  ] as const;

for (const scenario of extendedJourneyScenarios) {
  test(`${scenario.journeyHeading} completes from evidence to archived outputs`, async ({ page }) => {
    test.setTimeout(120_000);
    await login(page);
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
    await activateBranch(page, id, scenario.optionalBranch);

    for (const [key, action] of scenario.services) {
      await page.goto(`/journeys/${id}/services/${key}`);
      await expect(page.getByRole("button", { name: action })).toBeVisible();
      const missingEvidence = page.getByRole("button", { name: "Use sample evidence" });
      if (await missingEvidence.isVisible()) await missingEvidence.click();
      await page.getByLabel("I authorise an AI review of this synthetic case").check();
      await page.getByRole("button", { name: action }).click();
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
      await expect(page.locator(".service-artifact").getByRole("heading", { name: /^Synthetic .+ result$/ })).toBeVisible();
      await expect(page.locator(".service-timeline time")).toHaveCount(1);
    }

    await page.goto(`/journeys/${id}`);
    await expectJourneyNodesComplete(page, id, 5);
    await expect(page.getByText(scenario.completed)).toBeVisible();
    await page.goto("/journeys");
    await expect(page.locator("#completed-journeys").getByRole("heading", { name: scenario.journeyHeading })).toBeVisible();
    await page.goto("/documents");
    await expect(page.getByText(/^Synthetic .+ result$/).last()).toBeVisible();
    await page.goto("/activity");
    await page.getByRole("tab", { name: "History" }).click();
    await expect(page.getByText(scenario.activity, { exact: true })).toBeVisible();
    await page.request.post("/api/demo/reset");
  });
}

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
  await page.getByRole("tab", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "What needs your attention", exact: true })).toBeVisible();
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

test("the synthetic agency pauses for clarification and resumes after the citizen responds", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);
  await page.request.post(`/api/journeys/${id}/nodes/birth_registration/submit`, { data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "provider-registration" } });
  await page.request.post(`/api/journeys/${id}/nodes/birth_certificate/submit`, { data: { idempotencyKey: "agency-certificate-review", consent: true } });
  await page.request.patch(`/api/journeys/${id}/facts`, { data: { facts: { "test.agencyOutcome.child_health_record": "action_required" } } });
  const started = await page.request.post(`/api/journeys/${id}/nodes/child_health_record/submit`, { data: { idempotencyKey: "provider-clarification-start", consent: true } });
  expect(started.ok()).toBeTruthy();

  await expect.poll(async () => {
    const response = await page.request.get(`/api/journeys/${id}`);
    const journey = await response.json() as { serviceRuns: { child_health_record?: { caseStatus?: string } } };
    return journey.serviceRuns.child_health_record?.caseStatus;
  }, { timeout: 6_000 }).toBe("action_required");
  await page.goto(`/journeys/${id}/services/child_health_record`);
  await expect(page.getByText("The synthetic agency needs more information")).toBeVisible();
  await expect(page.getByText("Reason code: MORE_INFORMATION_REQUIRED")).toBeVisible();
  await page.getByLabel("Provide the requested information").fill("Please use Apollo Clinic, Serilingampally as the preferred clinic.");
  await page.getByRole("button", { name: "Send clarification for AI review" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 8_000 });
  await expect(page.getByRole("heading", { name: "Synthetic Mother and child record result" })).toBeVisible();
});

test("failed AI document analysis is visible and leaves every journey unchanged", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await seedJourney(page);
  await openDocumentAssistant(page);
  await page.route("**/api/assistant/documents", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ code: "DOCUMENT_ANALYSIS_FAILED", message: "AI could not analyse that document. Please try again or upload a clearer copy." }),
    });
  });
  await page.locator('.document-desk input[type="file"]').setInputFiles({
    name: "registration-certificate.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nvalid container"),
  });
  await page.getByRole("button", { name: "Analyse document" }).click();
  await expect(page.getByText("AI could not analyse that document. Please try again or upload a clearer copy.")).toBeVisible();
  await expect(page.getByText("No journey data was changed.")).toBeVisible();
  const body = await (await page.request.get("/api/journeys")).json() as { journeys: unknown[] };
  expect(body.journeys).toHaveLength(1);
  await page.request.post("/api/demo/reset");
});

test("authenticated workflow pages have no serious accessibility violations", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);
  await page.request.post(`/api/journeys/${id}/nodes/birth_registration/submit`, { data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "axe-registration" } });
  for (const route of ["/", "/journeys", "/documents", "/activity", "/intake", `/journeys/${id}`, `/journeys/${id}/birth-registration`, `/journeys/${id}/success`, `/journeys/${id}/services/child_health_record`]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
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
  const mobileSignOut = page.getByRole("button", { name: "Sign out Ananya Sharma" });
  await expect(mobileSignOut).toBeVisible();
  const signOutBox = await mobileSignOut.boundingBox();
  expect(signOutBox?.width).toBeGreaterThanOrEqual(44);
  expect(signOutBox?.height).toBeGreaterThanOrEqual(44);
  sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);
  await page.request.post(`/api/journeys/${id}/nodes/birth_registration/submit`, { data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "mobile-registration" } });
  await page.request.post(`/api/journeys/${id}/nodes/birth_certificate/submit`, { data: { idempotencyKey: "mobile-certificate-review", consent: true } });
  await page.goto(`/journeys/${id}/services/child_health_record`);
  await page.getByLabel("I authorise an AI review of this synthetic case").check();
  await page.getByRole("button", { name: "Create health record" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100", { timeout: 10_000 });
  sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
  for (const route of ["/documents", "/activity", "/journeys"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(sizes.scroll, route).toBeLessThanOrEqual(sizes.client);
  }
});
