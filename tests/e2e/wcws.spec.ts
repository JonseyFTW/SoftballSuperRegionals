import { rmSync } from "node:fs";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  rmSync(path.join(process.cwd(), ".e2e-data"), { recursive: true, force: true });
});

test("public dashboard shows the bracket, leaderboard, payout, and PWA metadata", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("WCWS Pick'em");
  await expect(page.getByRole("heading", { name: "WCWS Pick'em" })).toBeVisible();
  await expect(page.locator(".bracket-pod")).toHaveCount(2);
  await expect(page.locator(".bracket-game")).toHaveCount(13);
  await expect(page.getByText("Championship Finals · Best of 3")).toBeVisible();
  await expect(page.getByText("Texas Tech").first()).toBeVisible();
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

test("admin can add an entrant via the bracket picker", async ({ page }) => {
  await login(page);

  const entrantAdmin = page.locator("section", { hasText: "Entrants + Picks" });
  const addForm = entrantAdmin.locator("form.entrant-form").first();
  await addForm.getByLabel("Name").fill("Taylor Tester");
  await addForm.getByLabel("Tie-breaker runs").fill("11");
  await addForm.getByLabel("Paid").check();
  // Pick the top team in Game 1 (winners' bracket round 1).
  const game1 = addForm.locator("article.picker-game", { hasText: "Game 1" });
  await game1.locator("button.picker-team").first().click();
  await submitServerAction(page, addForm.getByRole("button", { name: "Add entrant" }));

  await expect(page.locator("summary", { hasText: "Taylor Tester" })).toBeVisible();
  await page.goto("/entrants");
  await expect(page.getByRole("link", { name: "Taylor Tester" })).toBeVisible();
});

test("admin entrant list keeps existing pickers collapsed until a name is opened", async ({
  page,
}) => {
  await login(page);

  const entrantAdmin = page.locator("section", { hasText: "Entrants + Picks" });
  const addForm = entrantAdmin.locator("form.entrant-form").first();
  await expect(addForm.getByLabel("Name")).toBeVisible();
  await expect(addForm.locator(".bracket-picker")).toBeVisible();

  const sampleLeader = entrantAdmin.locator("summary", { hasText: "Sample Leader" });
  const sampleLeaderForm = entrantAdmin.locator(
    'form.entrant-form:has(input[name="entrantId"][value="entry-sample-1"])',
  );
  await expect(sampleLeader).toBeVisible();
  await expect(sampleLeaderForm.getByLabel("Name")).toBeHidden();

  await sampleLeader.click();
  await expect(sampleLeaderForm.getByLabel("Name")).toBeVisible();
  await expect(sampleLeaderForm.locator(".bracket-picker")).toBeVisible();
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

  await page.goto("/");
  await expect(page.getByText("2 places paid")).toBeVisible();
});

test("admin matchup editor keeps winner fields collapsed until a game is opened", async ({
  page,
}) => {
  await login(page);

  const matchupAdmin = page.locator("section", { hasText: "Matchups + Winners" });
  const game1Details = matchupAdmin.locator(
    'details.admin-disclosure:has(input[name="matchupId"][value="g1"])',
  );
  await expect(game1Details.locator("summary")).toBeVisible();
  await expect(game1Details.getByLabel("Winner")).toBeHidden();

  await game1Details.locator("summary").click();
  await expect(game1Details.getByLabel("Winner")).toBeVisible();
});

test("public bracket entry can be opened and submitted", async ({ page }) => {
  await login(page);
  const settings = page.locator("form.settings-grid");
  const toggle = settings.locator('input[name="publicEntriesOpen"]');
  if (!(await toggle.isChecked())) await toggle.check();
  await submitServerAction(page, settings.getByRole("button", { name: "Save settings" }));

  await page.goto("/enter");
  await expect(page.getByRole("heading", { name: "Fill out your bracket" })).toBeVisible();
  await page.getByLabel("Your name").fill("Self Service");
  const game1 = page.locator("article.picker-game", { hasText: "Game 1" });
  await game1.locator("button.picker-team").first().click();
  await Promise.all([
    page.waitForURL(/\/entrants\/entry-/),
    page.getByRole("button", { name: "Submit my bracket" }).click(),
  ]);
  await expect(page.getByRole("heading", { name: "Self Service" })).toBeVisible();
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
