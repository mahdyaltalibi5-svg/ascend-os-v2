import { expect, test, type Page } from "@playwright/test";

test("founder completes primary revenue workflow", async ({ page }) => {
  const unique = Date.now();
  const email = `revenue-founder-${unique}@example.com`;
  const password = "SecurePass123";
  const clientName = `Apex Revenue ${unique}`;

  await page.goto("/signup");
  await page.getByLabel("Name").fill("Revenue Founder");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByRole("heading", { name: "Create your organization" })).toBeVisible();
  await page.getByLabel("Organization name").fill(`Revenue Org ${unique}`);
  await page.getByLabel("Website").fill("https://example.com");
  await page.getByRole("button", { name: "Create organization" }).click();

  await expect(page).toHaveURL(/\/app$/, { timeout: 20000 });
  await page.getByRole("link", { name: /Revenue/ }).click();
  await expect(page.getByRole("heading", { name: "Financial operating center" })).toBeVisible();

  await page.getByLabel("Goal name").fill("Monthly cash collected");
  await page.getByLabel("Target amount").fill("10000");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByText("$0 collected of $10,000")).toBeVisible();

  const clientWorkflow = await openWorkflow(page, "Add client");
  await clientWorkflow.getByLabel("Business name").fill(clientName);
  await clientWorkflow.getByRole("button", { name: "Add client" }).click();

  const serviceWorkflow = await openWorkflow(page, "Add service");
  await serviceWorkflow.getByLabel("Service name").fill(`Automation ${unique}`);
  await serviceWorkflow.getByRole("button", { name: "Save service" }).click();

  const contractWorkflow = await openWorkflow(page, "Add contract");
  await contractWorkflow.getByLabel("Client").selectOption({ label: clientName });
  await contractWorkflow.getByLabel("Contract name").fill("Automation Sprint");
  await contractWorkflow.getByLabel("Contracted amount").fill("5000");
  await contractWorkflow.getByLabel("Billing").selectOption("recurring");
  await contractWorkflow.getByLabel("MRR amount").fill("1000");
  await contractWorkflow.getByRole("button", { name: "Create contract" }).click();
  await expect(page.getByText("Automation Sprint")).toBeVisible();

  const invoiceWorkflow = await openWorkflow(page, "Add invoice");
  await invoiceWorkflow.getByLabel("Client").selectOption({ label: clientName });
  await invoiceWorkflow.getByLabel("Amount").fill("5000");
  await invoiceWorkflow.getByLabel("Due date").fill("2026-12-31");
  await invoiceWorkflow.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByText("$5,000")).toBeVisible();

  const firstPaymentWorkflow = await openWorkflow(page, "Record payment");
  await firstPaymentWorkflow.getByLabel("Client").selectOption({ label: clientName });
  await firstPaymentWorkflow.getByLabel("Amount").fill("2500");
  await firstPaymentWorkflow.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("$2,500 collected of $10,000")).toBeVisible();

  const secondPaymentWorkflow = await openWorkflow(page, "Record payment");
  await secondPaymentWorkflow.getByLabel("Client").selectOption({ label: clientName });
  await secondPaymentWorkflow.getByLabel("Amount").fill("2500");
  await secondPaymentWorkflow.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("$5,000 collected of $10,000")).toBeVisible();

  const recurringWorkflow = await openWorkflow(page, "Add recurring revenue");
  await recurringWorkflow.getByLabel("Client").selectOption({ label: clientName });
  await recurringWorkflow.getByLabel("Amount").fill("1000");
  await recurringWorkflow.getByLabel("Next expected").fill("2026-12-31");
  await recurringWorkflow.getByRole("button", { name: "Add recurring revenue" }).click();
  await expect(page.getByText("MRR")).toBeVisible();

  await page.getByRole("button", { name: "Create snapshot" }).click();
  await page.getByRole("button", { name: "Add priority" }).first().click();

  await page.reload();
  await expect(page.getByText(clientName)).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: "Financial operating center" })).toBeVisible();
});

test("salesperson cannot access the revenue dashboard", async ({ page }) => {
  await page.goto("/signin");
  await page.getByLabel("Email").fill("sales@ascend.local");
  await page.getByLabel("Password").fill("AscendDev123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.goto("/app/revenue");
  await expect(page).toHaveURL(/\/app/);
  await expect(page.getByRole("heading", { name: "Financial operating center" })).toHaveCount(0);
});

async function openWorkflow(page: Page, title: string) {
  const workflow = page.locator("details").filter({
    has: page.locator("summary", { hasText: title })
  });

  await expect(workflow).toBeVisible();
  const isOpen = await workflow.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!isOpen) {
    await workflow.locator("summary").click();
  }

  return workflow;
}
