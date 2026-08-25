import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("golden newborn journey completes and unlocks downstream services", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Life happens. We guide you." })).toBeVisible();
  await expect(page).toHaveScreenshot("home-1280.png", { fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: /Start New Baby Journey/i }).click();
  await expect(page.getByRole("heading", { name: "Tell us what happened." })).toBeVisible();
  await page.getByRole("button", { name: "Not sure" }).click();
  await page.getByRole("button", { name: "Build My Journey" }).click();
  await expect(page.getByRole("heading", { name: "Your family journey is ready." })).toBeVisible();
  await page.getByRole("link", { name: /Review Birth Registration/i }).click();
  await page.getByRole("button", { name: /Submit Demo Registration/i }).click();
  await expect(page.getByText("Enter the child's name")).toBeVisible();
  await page.getByLabel("Child’s name").fill("Aarav Sharma");
  await page.getByLabel("Local ward / area").selectOption({ label: "Ward 72 — Serilingampally" });
  await page.getByRole("button", { name: /Submit Demo Registration/i }).click();
  await expect(page.getByRole("heading", { name: /Birth registered/i })).toBeVisible();
  await expect(page.getByText("Unlocked", { exact: true })).toBeVisible();
  await expect(page.getByText("Prototype — this registration is simulated.")).toBeVisible();
  await expect(page).toHaveScreenshot("success-1280.png", { fullPage: true, animations: "disabled" });
});

test("core pages have no serious accessibility violations", async ({ page }) => {
  for (const route of ["/", "/intake", "/journeys/demo-new-baby"]) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
  }
});

test("home page has no horizontal overflow at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
});
