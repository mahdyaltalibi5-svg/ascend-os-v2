import { expect, test, type Page } from "@playwright/test";

test("unauthenticated users cannot access CRM pages", async ({ page }) => {
  await page.goto("/app/sales");
  await expect(page).toHaveURL(/\/signin/);
  await expect(page.getByRole("heading", { name: "Sign in to Ascend OS" })).toBeVisible();
});

test("Mahdy and Logan can work assigned CRM leads end to end", async ({ page }) => {
  test.setTimeout(120_000);
  const unique = Date.now();
  const hvacName = `Wasatch HVAC ${unique}`;
  const plumbingName = `Wasatch Plumbing ${unique}`;
  const csvName = `CSV Plumbing ${unique}`;
  const hvacPhone = `801-555-${String(unique).slice(-4)}`;
  const plumbingPhone = `385-555-${String(unique).slice(-4)}`;
  const csvPhone = `435-555-${String(unique).slice(-4)}`;

  await signIn(page, "mahdy@ascend.local");
  await page.getByRole("link", { name: /Sales/ }).click();
  await expect(page.getByRole("heading", { name: "Utah HVAC and plumbing CRM" })).toBeVisible();

  await createLead(page, {
    businessName: hvacName,
    trade: "HVAC",
    phone: hvacPhone,
    ownerName: "Jamie Owner",
    assignee: "Logan"
  });
  await expect(page.getByText(hvacName)).toBeVisible();

  await createLead(page, {
    businessName: plumbingName,
    trade: "Plumbing",
    phone: plumbingPhone,
    ownerName: "Morgan Owner",
    assignee: "Mahdy"
  });
  await expect(page.getByText(plumbingName)).toBeVisible();

  await page.goto(`/app/sales?q=${encodeURIComponent(hvacName)}&trade=HVAC&sort=name`);
  await expect(page.getByText(hvacName)).toBeVisible();
  await expect(page.getByText(plumbingName)).toHaveCount(0);

  await page.getByRole("link", { name: "Detail" }).first().click();
  await expect(page.getByRole("heading", { name: hvacName })).toBeVisible();
  await expect(page.getByText("Official company website")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: hvacName })).toBeVisible();

  const leadsCsv = await page.request.get("/app/sales/export?type=leads");
  expect(leadsCsv.ok()).toBe(true);
  const exported = await leadsCsv.text();
  expect(exported).toContain(hvacName);
  expect(exported).toContain(hvacPhone.replace(/\D/g, ""));

  await page.goto("/app/sales");
  await importCsv(page, [
    "Business name,Trade,Owner name,Phone,Website,City,State,Phone verification method,Phone verification source,Phone type,Call Ready",
    `${csvName},Plumbing,Casey Owner,${csvPhone},https://csv.example,Salt Lake City,UT,official_company_website,https://csv.example/contact,official_company_line,true`
  ]);
  await expect(page.getByText(csvName)).toBeVisible();

  await signOut(page);
  await signIn(page, "logan@ascend.local");
  await page.goto(`/app/sales?q=${encodeURIComponent(hvacName)}`);
  await expect(page.getByText(hvacName)).toBeVisible();
  await page.getByRole("button", { name: "Convert" }).first().click();
  await page.getByRole("link", { name: "Queue", exact: true }).click();
  await expect(page.getByText(hvacName)).toBeVisible();

  await page.goto(`/app/sales?q=${encodeURIComponent(hvacName)}`);
  await page.getByRole("link", { name: "Detail" }).first().click();
  await page.getByRole("button", { name: "Suppress number" }).click();
  await expect(page.getByText("Do not call").first()).toBeVisible();
  await page.getByRole("link", { name: "Back to CRM" }).click();
  await page.getByRole("link", { name: "Queue", exact: true }).click();
  await expect(page.getByText(hvacName)).toHaveCount(0);
});

test("duplicate normalized phone displays a useful CRM error", async ({ page }) => {
  const unique = Date.now();
  const businessName = `Duplicate HVAC ${unique}`;
  const duplicateName = `Duplicate HVAC Alt ${unique}`;
  const phone = `801-777-${String(unique).slice(-4)}`;

  await signIn(page, "mahdy@ascend.local");
  await page.getByRole("link", { name: /Sales/ }).click();
  await createLead(page, {
    businessName,
    trade: "HVAC",
    phone,
    ownerName: "Duplicate Owner",
    assignee: "Mahdy"
  });
  await expect(page.getByText(businessName)).toBeVisible();

  await createLead(page, {
    businessName: duplicateName,
    trade: "HVAC",
    phone: `(${phone.slice(0, 3)}) ${phone.slice(4, 7)}-${phone.slice(8)}`,
    ownerName: "Duplicate Owner",
    assignee: "Mahdy",
    expectCreated: false
  });
  await expect(page.getByRole("heading", { name: "CRM action needs attention" })).toBeVisible();
  await expect(page.getByText("normalized phone number already exists")).toBeVisible();
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
    trade: "HVAC" | "Plumbing";
    phone: string;
    ownerName: string;
    assignee: string;
    expectCreated?: boolean;
  }
) {
  const evidenceHost = `${input.businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}.example.test`;
  await openLeadTools(page);
  const form = page.locator('form:has(input[name="businessName"])').first();
  await form.locator('input[name="businessName"]').fill(input.businessName);
  await form.locator('select[name="trade"]').selectOption(input.trade);
  await form.locator('input[name="ownerName"]').fill(input.ownerName);
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
  if (input.expectCreated === false) return;
  await expect(page.locator("h3", { hasText: input.businessName })).toBeVisible({
    timeout: 15000
  });
}

async function importCsv(page: Page, rows: string[]) {
  await openLeadTools(page);
  await page.locator('textarea[name="csv"]').fill(rows.join("\n"));
  await page.getByRole("button", { name: "Import CSV" }).click();
}

async function openLeadTools(page: Page) {
  await page.locator("details", { hasText: "Lead tools" }).evaluate((element) => {
    if (element instanceof HTMLDetailsElement) {
      element.open = true;
    }
  });
}
