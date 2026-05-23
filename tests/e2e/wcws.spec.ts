import { rmSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  rmSync(path.join(process.cwd(), ".e2e-data"), { recursive: true, force: true });
});

test("public dashboard shows leaderboard, payout, live cards, and PWA metadata", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("WCWS Pick'em");
  await expect(page.getByRole("heading", { name: "WCWS Pick'em" })).toBeVisible();
  await expect(page.locator(".game-card, .matchup-row")).toHaveCount(8);
  await expect(page.getByText(/Alabama|ALA/).first()).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Sample Chaser");
  await expect(page.getByText("Expected pot")).toBeVisible();
  await expect(page.getByText("Likely Winners")).toBeVisible();

  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  expect(await manifestResponse.json()).toMatchObject({
    display: "standalone",
    name: "WCWS Pick'em",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const hasOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth > window.innerWidth ||
      document.body.scrollWidth > window.innerWidth,
  );
  expect(hasOverflow).toBe(false);
});

test("theme toggle switches dark mode and saves the preference", async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("theme-test-ready")) {
      localStorage.removeItem("wcws-theme");
      sessionStorage.setItem("theme-test-ready", "true");
    }
    window.matchMedia = (query) =>
      ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
      }) as MediaQueryList;
  });
  await page.goto("/");

  await expect(page.locator("html")).not.toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("entrant pages expose public picks without payment tags", async ({ page }) => {
  await page.goto("/entrants");
  await page.getByRole("link", { name: "Sample Chaser" }).click();

  await expect(page).toHaveURL(/\/entrants\/entry-sample-2/);
  await expect(page.getByRole("heading", { name: "Sample Chaser" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bracket Picks" })).toBeVisible();
  await expect(page.getByText("sample@example.com")).toHaveCount(0);
});

test("admin route is protected", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible();
});

test("admin can add an entrant and edit picks", async ({ page }) => {
  await login(page);

  const addForm = page.locator("form.entrant-form").first();
  await addForm.getByLabel("Name").fill("Taylor Tester");
  await addForm.getByLabel("Tie-breaker runs").fill("21");
  await addForm.getByLabel("Paid").check();
  await addForm.locator('select[name="pick-super-alabama-lsu"]').selectOption("lsu");
  await addForm.locator('select[name="pick-super-tennessee-georgia"]').selectOption("tennessee");
  await submitServerAction(page, addForm.getByRole("button", { name: "Add entrant" }));

  await expect(page.locator("summary", { hasText: "Taylor Tester" })).toBeVisible();
  await page.goto("/entrants");
  await expect(page.getByRole("link", { name: "Taylor Tester" })).toBeVisible();
});

test("admin entrant list keeps existing pick forms collapsed until a name is opened", async ({
  page,
}) => {
  await login(page);

  const entrantAdmin = page.locator("section", { hasText: "Entrants + Picks" });
  const addForm = entrantAdmin.locator("form.entrant-form").first();
  await expect(addForm.getByLabel("Name")).toBeVisible();
  await expect(addForm.locator('select[name="pick-super-alabama-lsu"]')).toBeVisible();

  const sampleLeader = entrantAdmin.locator("summary", { hasText: "Sample Leader" });
  const sampleLeaderForm = entrantAdmin.locator(
    'form.entrant-form:has(input[name="entrantId"][value="entry-sample-1"])',
  );
  await expect(sampleLeader).toBeVisible();
  await expect(sampleLeaderForm.getByLabel("Name")).toBeHidden();

  await sampleLeader.click();
  await expect(sampleLeaderForm.getByLabel("Name")).toBeVisible();
  await expect(sampleLeaderForm.locator('select[name="pick-super-alabama-lsu"]')).toBeVisible();
});

test("admin entrant changes autosave when controls change", async ({ page }) => {
  await login(page);

  const entrantAdmin = page.locator("section", { hasText: "Entrants + Picks" });
  await entrantAdmin.locator("summary", { hasText: "Sample Chaser" }).click();

  const sampleChaserForm = entrantAdmin.locator(
    'form.entrant-form:has(input[name="entrantId"][value="entry-sample-2"])',
  );

  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    sampleChaserForm.getByLabel("Paid").check(),
  ]);

  await expect(page.locator("summary", { hasText: "Sample Chaser" })).toContainText("Paid");
});

test("public entrant standings update while the page stays open", async ({ context }) => {
  const publicPage = await context.newPage();
  await publicPage.goto("/entrants");
  await expect(
    publicPage.locator(".entrant-card", { hasText: "Sample Leader" }).locator(".pill-paid"),
  ).toContainText("Paid");

  const adminPage = await context.newPage();
  await login(adminPage);

  const entrantAdmin = adminPage.locator("section", { hasText: "Entrants + Picks" });
  await entrantAdmin.locator("summary", { hasText: "Sample Leader" }).click();
  const sampleLeaderForm = entrantAdmin.locator(
    'form.entrant-form:has(input[name="entrantId"][value="entry-sample-1"])',
  );
  await Promise.all([
    adminPage.waitForResponse((response) => response.request().method() === "POST"),
    sampleLeaderForm.getByLabel("Paid").uncheck(),
  ]);

  await expect(
    publicPage.locator(".entrant-card", { hasText: "Sample Leader" }).locator(".pill-unpaid"),
  ).toContainText("Unpaid", { timeout: 20_000 });

  await publicPage.close();
  await adminPage.close();
});

test("admin can change payout setup", async ({ page }) => {
  await login(page);

  const settings = page.locator("form.settings-grid");
  await settings.locator('select[name="payoutPlaces"]').selectOption("2");
  await settings.locator('input[name="payoutPercent-1"]').fill("70");
  await settings.locator('input[name="payoutPercent-2"]').fill("30");
  await submitServerAction(page, settings.getByRole("button", { name: "Save settings" }));

  await expect(page).toHaveURL(/\/admin$/);
  await expect(settings.locator('select[name="payoutPlaces"]')).toHaveValue("2");
  await expect(settings.locator('input[name="payoutPercent-1"]')).toHaveValue("70");
  await expect(settings.locator('input[name="payoutPercent-2"]')).toHaveValue("30");

  await page.goto("/");
  await expect(page.getByText("2 places paid")).toBeVisible();
});

test("admin can change payout setup to one paid place", async ({ page }) => {
  await login(page);

  const settings = page.locator("form.settings-grid");
  await settings.locator('select[name="payoutPlaces"]').selectOption("1");
  await settings.locator('input[name="payoutPercent-1"]').fill("100");
  await submitServerAction(page, settings.getByRole("button", { name: "Save settings" }));

  await expect(page).toHaveURL(/\/admin$/);
  await expect(settings.locator('select[name="payoutPlaces"]')).toHaveValue("1");
  await expect(settings.locator('input[name="payoutPercent-1"]')).toHaveValue("100");

  await page.goto("/");
  await expect(page.getByText("1 place paid")).toBeVisible();
});

test("admin matchup editor keeps full winner fields collapsed until a game is opened", async ({
  page,
}) => {
  await login(page);

  const matchupAdmin = page.locator("section", { hasText: "Matchups + Winners" });
  const alabamaLsuForm = matchupAdmin.locator(
    'form.matchup-form:has(input[name="matchupId"][value="super-alabama-lsu"])',
  );
  const alabamaLsuSummary = matchupAdmin.locator("summary", { hasText: "Alabama vs LSU" });
  await expect(alabamaLsuSummary).toBeVisible();
  await expect(alabamaLsuForm.getByLabel("Label")).toBeHidden();

  await alabamaLsuSummary.click();
  await expect(alabamaLsuForm.getByLabel("Label")).toBeVisible();
  await expect(alabamaLsuForm.getByLabel("Winner")).toBeVisible();
});

async function login(page: Page) {
  await page.goto("/admin");
  if (await page.getByLabel("Password").isVisible()) {
    await page.getByLabel("Password").fill("admin");
    await page.getByRole("button", { name: "Enter admin portal" }).click();
  }

  await expect(page.getByRole("heading", { name: "Admin Portal" })).toBeVisible();
}

async function submitServerAction(page: Page, button: Locator) {
  await Promise.all([
    page.waitForResponse((response) => response.request().method() === "POST"),
    button.click(),
  ]);
}
