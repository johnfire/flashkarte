import { Pool } from "pg";
import { test, expect } from "@playwright/test";
import {
  apiAsSignedInUser,
  declineAnalytics,
  lastMailTo,
  signUpVerifyAndSignIn,
} from "./support";

const database = process.env.POSTGRES_DB ?? "flashkarte";
if (!database.endsWith("_test") && !process.env.CI)
  throw new Error("Promo E2E requires an isolated _test database locally");
const pool = new Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database,
  user: process.env.POSTGRES_USER ?? "flashkarte",
  password: process.env.POSTGRES_PASSWORD ?? "flashkarte",
});
test.afterAll(() => pool.end());

test("admin creates and pauses a promo; signup activates it and expiry returns to Free", async ({
  page,
  browser,
}, testInfo) => {
  const stamp = Date.now();
  const adminEmail = `promo-admin-${stamp}@example.com`;
  const customerEmail = `promo-customer-${stamp}@example.com`;
  const code = `E2EFREE${stamp}`;
  await signUpVerifyAndSignIn(page, adminEmail);
  await pool.query("UPDATE users SET account_type = 'admin' WHERE email = $1", [
    adminEmail,
  ]);
  await page.reload();
  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await page.getByLabel("Promo code", { exact: true }).fill(code);
  await page.getByLabel("Benefit", { exact: true }).selectOption("free_access");
  await page.getByLabel("Days of free access", { exact: true }).fill("30");
  await page.getByLabel("Maximum activations (optional)").fill("2");
  await page.getByRole("button", { name: "Create promo", exact: true }).click();
  await expect(
    page.getByText(`${code} · Active`, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `Pause ${code}`, exact: true })
    .click();
  await expect(
    page.getByText(`${code} · Paused`, { exact: true }),
  ).toBeVisible();

  const context = await browser.newContext();
  const customer = await context.newPage();
  try {
    await declineAnalytics(customer);
    await customer.goto("/login?mode=signup");
    await customer.getByLabel("Promo code", { exact: true }).fill(code);
    await customer
      .getByRole("button", { name: "Apply code", exact: true })
      .click();
    await expect(customer.getByRole("alert")).toContainText("paused");
    await expect(
      customer.getByRole("button", { name: "Sign up", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: `Resume ${code}`, exact: true })
      .click();
    await expect(
      page.getByText(`${code} · Active`, { exact: true }),
    ).toBeVisible();
    await customer
      .getByRole("button", { name: "Apply code", exact: true })
      .click();
    await expect(
      customer.getByText("30 days of free access", { exact: true }),
    ).toBeVisible();
    await customer.screenshot({
      path: testInfo.outputPath("promo-signup.png"),
    });
    await expect(customer.getByText(/No payment details needed/)).toBeVisible();
    await customer.getByLabel("Email", { exact: true }).fill(customerEmail);
    await customer
      .getByLabel("Password (min 8 chars)", { exact: true })
      .fill("E2ePassword-1");
    await customer
      .getByRole("button", { name: "Sign up", exact: true })
      .click();
    await expect(
      customer.getByRole("heading", {
        name: "Verify your email to get started",
      }),
    ).toBeVisible();
    const link = lastMailTo(customerEmail).text.match(
      /https?:\/\/\S+verify-email\S+/,
    )?.[0];
    expect(link).toBeTruthy();
    await customer.goto(link!);
    await expect(customer.getByText(/verified/i).first()).toBeVisible();
    await customer.goto("/login");
    await customer.getByLabel("Email", { exact: true }).fill(customerEmail);
    await customer
      .getByLabel("Password (min 8 chars)", { exact: true })
      .fill("E2ePassword-1");
    await customer
      .getByRole("button", { name: "Sign in", exact: true })
      .click();
    await expect(
      customer.getByRole("heading", { name: "My Decks" }),
    ).toBeVisible();
    const accountApi = await apiAsSignedInUser(customer);
    expect(await accountApi.send("GET", "/billing/status")).toMatchObject({
      plan: "paid",
      accountType: "free",
      subscription: null,
      activeUnitLimit: null,
    });
    await customer.getByRole("link", { name: "Settings", exact: true }).click();
    await expect(
      customer.getByText(/Your free promo access ends on/),
    ).toBeVisible();
    await pool.query(
      `UPDATE signup_promo_activations SET access_expires_at = now() - interval '1 second'
      WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
      [customerEmail],
    );
    await customer.reload();
    await expect(
      customer.getByRole("heading", { name: "Subscription", exact: true }),
    ).toBeVisible();
    const refreshedApi = await apiAsSignedInUser(customer);
    expect(await refreshedApi.send("GET", "/billing/status")).toMatchObject({
      plan: "free",
      promoAccessEndsAt: null,
      activeUnitLimit: 10,
    });
    await expect(
      customer.getByText(/Your free promo access ends on/),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page
        .getByRole("listitem")
        .filter({
          has: page.getByText(`${code} · Active`, { exact: true }),
        })
        .getByText("Activations: 1 / 2", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("heading", { name: "Signup promos", exact: true })
      .locator("..")
      .screenshot({ path: testInfo.outputPath("admin-promos.png") });
  } finally {
    await context.close();
  }
});
