import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const email = "demo@umang.com";
const password = "demo1234";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in to the evaluation" }).click();
  await expect(page.getByRole("heading", { name: /Life happens\. We guide you\.|Welcome back, Ananya\./ })).toBeVisible();
}

async function seedJourney(page: Page) {
  const created = await page.request.post("/api/journeys", {
    data: { facts: { "birth.city": "Hyderabad", "birth.state": "Telangana", "child.dateOfBirth": "2026-08-24", "birth.hospital": "Apollo Hospital" } },
  });
  expect(created.ok()).toBeTruthy();
  const journey = await created.json() as { id: string };
  return journey.id;
}

test.describe.configure({ mode: "serial" });

test("only the seeded evaluation account can sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?returnTo=%2F$/);
  await expect(page.getByText("Account creation is intentionally disabled.")).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up|register/i })).toHaveCount(0);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in to the evaluation" }).click();
  await expect(page.getByText("The email or password is incorrect.")).toBeVisible();
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in to the evaluation" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("newborn journey persists, completes every sandbox integration, downloads a PDF, and resets", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  await expect(page).toHaveScreenshot("home-1280.png", { fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: /Start New Baby Journey/i }).click();
  await page.getByRole("button", { name: "Not sure" }).click();
  await page.getByRole("button", { name: "Build My Journey" }).click();
  await expect(page.getByRole("heading", { name: "Your family journey is ready." })).toBeVisible();
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
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(6);
  await page.reload();
  await expect(page.getByText("Completed", { exact: true })).toHaveCount(6);
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
  await expect(page.getByRole("heading", { name: "Welcome back, Ananya." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aarav Sharma" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Birth certificate" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Aarav Sharma journey progress" })).toHaveAttribute("aria-valuenow", "17");
  await expect(page.getByRole("link", { name: /Start next step/i })).toHaveAttribute("href", `/journeys/${id}/services/birth_certificate`);

  await page.getByRole("button", { name: /Another baby journey/i }).click();
  await expect(page).toHaveURL(/\/intake$/);
  await page.request.post("/api/demo/reset");
});

test("authenticated workflow pages have no serious accessibility violations", async ({ page }) => {
  await login(page);
  await page.request.post("/api/demo/reset");
  const id = await seedJourney(page);
  await page.request.post(`/api/journeys/${id}/nodes/birth_registration/submit`, { data: { childName: "Aarav Sharma", localWard: "Ward 72", idempotencyKey: "axe-registration" } });
  for (const route of ["/", "/intake", `/journeys/${id}`, `/journeys/${id}/birth-registration`, `/journeys/${id}/success`, `/journeys/${id}/services/child_health_record`]) {
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
});
