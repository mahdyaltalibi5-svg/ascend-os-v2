import { expect, test, type Page } from "@playwright/test";

test("founder can view scraper command center while salesperson cannot", async ({ page }) => {
  await signIn(page, "mahdy@ascend.local");
  await expect(page.getByRole("link", { name: /Scraper/ })).toBeVisible();
  await page.getByRole("link", { name: /Scraper/ }).click();
  await expect(page.getByRole("heading", { name: "Verified Utah lead discovery" })).toBeVisible();
  await expect(page.getByText("HVAC and plumbing only.")).toBeVisible();

  await signOut(page);
  await signIn(page, "logan@ascend.local");
  await expect(page.getByRole("link", { name: /Scraper/ })).toHaveCount(0);
  await page.goto("/app/scraper");
  await expect(page.getByRole("heading", { name: "CRM action needs attention" })).toBeVisible();
  await expect(page.getByText("You do not have permission")).toBeVisible();
});

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("AscendDev123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app$/, { timeout: 20000 });
}

async function signOut(page: Page) {
  await page
    .getByRole("link", { name: /Sign out/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/signin/, { timeout: 20000 });
}
