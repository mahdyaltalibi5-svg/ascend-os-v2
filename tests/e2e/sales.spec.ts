import { expect, test } from "@playwright/test";

test("founder creates lead, converts prospect, records outreach, books appointment, and creates opportunity", async ({
  page
}) => {
  const unique = Date.now();
  const email = `sales-founder-${unique}@example.com`;
  const password = "SecurePass123";
  const businessName = `Apex Sales ${unique}`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Sales Founder");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Create your organization" })).toBeVisible({
    timeout: 20000
  });
  await page.getByLabel("Organization name").fill(`Sales Org ${unique}`);
  await page.getByLabel("Website").fill("https://example.com");
  await page.getByRole("button", { name: "Create organization" }).click();

  await expect(page).toHaveURL(/\/app$/, { timeout: 20000 });
  await page.getByRole("link", { name: /Sales/ }).click();
  await expect(page.getByRole("heading", { name: "Utah HVAC and plumbing CRM" })).toBeVisible();

  await page.getByRole("textbox", { name: "Business name", exact: true }).fill(businessName);
  await page.getByLabel("Owner name").fill("Jamie Smith");
  await page.getByLabel("Phone", { exact: true }).fill("801-555-0100");
  await page.getByLabel("Website", { exact: true }).fill("https://example.com");
  await page.getByLabel("Phone verification source").fill("https://example.com/contact");
  await page.getByLabel("Phone verification method").selectOption("official_company_website");
  await page.getByLabel("Phone type").selectOption("official_company_line");
  await page.getByRole("checkbox", { name: "Call ready" }).check();
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByText(businessName)).toBeVisible();

  await page.getByRole("button", { name: "Convert" }).first().click();
  await page.getByRole("link", { name: "Queue", exact: true }).click();
  await expect(page.getByText(businessName)).toBeVisible();
  await page.getByLabel("Outcome").selectOption("interested");
  await page.getByLabel("Duration seconds").fill("180");
  await page.getByRole("button", { name: "Save disposition" }).click();

  await page.getByRole("link", { name: "Appointments", exact: true }).click();
  await page.getByLabel("Title").fill("Sales call");
  await page.getByLabel("Start").fill("2026-08-01T10:00");
  await page.getByRole("textbox", { name: "End" }).fill("2026-08-01T11:00");
  await page.getByRole("button", { name: "Book appointment" }).click();
  await expect(page.getByRole("paragraph").filter({ hasText: "Sales call" })).toBeVisible();

  await page.getByRole("link", { name: "Pipeline", exact: true }).click();
  await expect(page.getByText(`${businessName} opportunity`)).toBeVisible();
  await page.reload();
  await expect(page.getByText(`${businessName} opportunity`)).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Utah HVAC and plumbing CRM" })).toBeVisible();
});
