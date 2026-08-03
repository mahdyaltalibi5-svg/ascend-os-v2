import { expect, test, type Page } from "@playwright/test";

test("Logan can run an assigned lead through the call desk", async ({ page }) => {
  test.setTimeout(120_000);
  const unique = Date.now();
  const businessName = `Call Desk HVAC ${unique}`;
  const phone = `801-555-${String(unique).slice(-4)}`;

  await signIn(page, "mahdy@ascend.local");
  await page.getByRole("link", { name: /Sales/ }).click();
  await createLead(page, {
    businessName,
    phone,
    assignee: "Logan"
  });
  await signOut(page);

  await signIn(page, "logan@ascend.local");
  await page.getByRole("link", { name: "Call Desk" }).click();
  await expect(page.getByRole("heading", { name: "Owner-first call desk" })).toBeVisible();
  await expect(page.getByText(businessName)).toBeVisible();
  await expect(page.locator(`a[href="tel:+1${phone.replace(/\D/g, "")}"]`)).toBeVisible();

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("button", { name: /0:0/ })).toBeVisible();
  await page.getByRole("button", { name: /No answer 1/ }).click();
  await expect(page.getByText(/No answer at/)).toBeVisible({ timeout: 20000 });

  await page.goto("/app/founder");
  await expect(page).toHaveURL(/\/app$/);
});

test("PWA manifest starts installed users at the call desk", async ({ page }) => {
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBe("Ascend Sales OS");
  expect(manifest.start_url).toBe("/app/call-desk");
  expect(manifest.display).toBe("standalone");
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

async function createLead(
  page: Page,
  input: {
    businessName: string;
    phone: string;
    assignee: string;
  }
) {
  const evidenceHost = `${input.businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.example.test`;
  const form = page.locator('form:has(input[name="businessName"])').first();
  await form.locator('input[name="businessName"]').fill(input.businessName);
  await form.locator('select[name="trade"]').selectOption("HVAC");
  await form.locator('input[name="ownerName"]').fill("Jamie Owner");
  await form.locator('select[name="assignedUserId"]').selectOption({ label: input.assignee });
  await form.locator('input[name="primaryPhone"]').fill(input.phone);
  await form.locator('input[name="websiteUrl"]').fill(`https://${evidenceHost}`);
  await form.locator('select[name="phoneType"]').selectOption("official_company_line");
  await form
    .locator('input[name="phoneVerificationSource"]')
    .fill(`https://${evidenceHost}/contact`);
  await form
    .locator('select[name="phoneVerificationMethod"]')
    .selectOption("official_company_website");
  await form.locator('input[name="city"]').fill("Salt Lake City");
  await form.getByRole("checkbox", { name: "Call ready" }).check();
  await form.getByRole("button", { name: "Add lead" }).click();
  await expect(page.locator("h3", { hasText: input.businessName })).toBeVisible({
    timeout: 15000
  });
}
