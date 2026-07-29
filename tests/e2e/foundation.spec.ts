import { expect, test } from "@playwright/test";

test("primary foundation happy path", async ({ browser, page }) => {
  test.setTimeout(90_000);

  const unique = Date.now();
  const email = `founder-${unique}@example.com`;
  const password = "SecurePass123";

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Milestone Founder");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Create your organization" })).toBeVisible({
    timeout: 20000
  });
  await page.getByLabel("Organization name").fill(`Ascend Test ${unique}`);
  await page.getByLabel("Website").fill("https://example.com");
  await page.getByRole("button", { name: "Create organization" }).click();

  await expect(page).toHaveURL(/\/app$/, { timeout: 20000 });
  await expect(page.getByRole("heading", { name: "What needs to happen today?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Revenue/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Settings/ })).toBeVisible();

  await page
    .getByRole("button", { name: /Sign out/ })
    .first()
    .click();
  await page.waitForURL(/\/signin/);
  await expect(page.getByRole("heading", { name: "Sign in to Ascend OS" })).toBeVisible();

  const salesContext = await browser.newContext();
  const salesPage = await salesContext.newPage();

  await salesPage.goto("/signin");
  await salesPage.getByLabel("Email").fill("sales@ascend.local");
  await salesPage.getByLabel("Password").fill("AscendDev123!");
  await salesPage.getByRole("button", { name: "Sign in" }).click();

  await expect(salesPage).toHaveURL(/\/app$/, { timeout: 20000 });
  await expect(salesPage.locator("body")).toContainText("Sales Command Center", {
    timeout: 30000
  });
  await expect(salesPage.getByRole("link", { name: /Revenue/ })).toHaveCount(0);
  await expect(salesPage.getByRole("link", { name: /Settings/ })).toHaveCount(0);

  await salesContext.close();
});
