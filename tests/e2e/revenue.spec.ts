import { expect, test } from "@playwright/test";

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

  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("link", { name: /Revenue/ }).click();
  await expect(page.getByRole("heading", { name: "Financial operating center" })).toBeVisible();

  await page.getByLabel("Goal name").fill("Monthly cash collected");
  await page.getByLabel("Target amount").fill("10000");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByText("$0 collected of $10,000")).toBeVisible();

  await page.getByText("Add client").click();
  await page.getByLabel("Business name").fill(clientName);
  await page.getByRole("button", { name: "Add client" }).click();

  await page.getByText("Add service").click();
  await page.getByLabel("Service name").fill(`Automation ${unique}`);
  await page.getByRole("button", { name: "Save service" }).click();

  await page.getByText("Add contract").click();
  await page.getByLabel("Client").selectOption({ label: clientName });
  await page.getByLabel("Contract name").fill("Automation Sprint");
  await page.getByLabel("Contracted amount").fill("5000");
  await page.getByLabel("Billing").selectOption("recurring");
  await page.getByLabel("MRR amount").fill("1000");
  await page.getByRole("button", { name: "Create contract" }).click();
  await expect(page.getByText("Automation Sprint")).toBeVisible();

  await page.getByText("Add invoice").click();
  await page.getByLabel("Client").selectOption({ label: clientName });
  await page.getByLabel("Amount").fill("5000");
  await page.getByLabel("Due date").fill("2026-12-31");
  await page.getByRole("button", { name: "Create invoice" }).click();
  await expect(page.getByText("$5,000")).toBeVisible();

  await page.getByText("Record payment").click();
  await page.getByLabel("Client").selectOption({ label: clientName });
  await page.getByLabel("Amount").fill("2500");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("$2,500 collected of $10,000")).toBeVisible();

  await page.getByText("Record payment").click();
  await page.getByLabel("Client").selectOption({ label: clientName });
  await page.getByLabel("Amount").fill("2500");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByText("$5,000 collected of $10,000")).toBeVisible();

  await page.getByText("Add recurring revenue").click();
  await page.getByLabel("Client").selectOption({ label: clientName });
  await page.getByLabel("Amount").fill("1000");
  await page.getByLabel("Next expected").fill("2026-12-31");
  await page.getByRole("button", { name: "Add recurring revenue" }).click();
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
