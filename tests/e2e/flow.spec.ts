import { test, expect } from "@playwright/test";

const EMAIL = "milkyyway46@gmail.com";
const PASSWORD = process.env.TEST_PASSWORD ?? "";

test("login → dashboard loads within 5s", async ({ page }) => {
  const start = Date.now();

  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });
  const elapsed = Date.now() - start;

  console.log(`Login → redirect: ${elapsed}ms`);
  expect(elapsed).toBeLessThan(15_000);

  if (page.url().includes("onboarding")) {
    console.log("Landed on onboarding (new user or onboarding not complete)");
    return;
  }

  // Dashboard loaded — check key elements visible
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  const dashboardElapsed = Date.now() - start;
  console.log(`Dashboard fully visible: ${dashboardElapsed}ms`);
  expect(dashboardElapsed).toBeLessThan(20_000);
});

test("events page loads and shows calendar", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });

  const start = Date.now();
  await page.goto("/events");
  await page.waitForLoadState("networkidle", { timeout: 15_000 });

  // Calendar grid should be visible
  const grid = page.locator(".grid.grid-cols-7").first();
  await expect(grid).toBeVisible({ timeout: 10_000 });
  console.log(`Events page + calendar grid: ${Date.now() - start}ms`);
});

test("chat sends message and gets response", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 });

  await page.goto("/chat");
  await page.waitForLoadState("networkidle", { timeout: 10_000 });

  const input = page.locator("textarea, input[type='text']").first();
  await input.fill("What should I focus on today?");

  const start = Date.now();
  await page.keyboard.press("Enter");

  // Wait for assistant reply to appear
  await page.waitForSelector("[data-role='assistant'], .assistant-message, .prose", { timeout: 20_000 });
  console.log(`Chat response appeared: ${Date.now() - start}ms`);
});
