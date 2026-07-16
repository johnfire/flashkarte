import fs from "fs";
import { test, expect, Page } from "@playwright/test";
import { generate } from "otplib";
import { MAIL_SINK } from "./playwright.config";

// The full account lifecycle against the real stack: signup → verify email →
// create deck → study a card → change password → enable 2FA → login with the
// code → export data → delete account → confirm gone. Sequential by design;
// each step depends on the one before it.

const email = `e2e-${Date.now()}@example.com`;
const password = "E2ePassword-1";
const newPassword = "E2ePassword-2";
let totpSecret = "";

test.describe.configure({ mode: "serial" });

function lastMailTo(address: string): { text: string } {
  const lines = fs
    .readFileSync(MAIL_SINK, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as { to: string; text: string });
  const mail = lines.filter((m) => m.to === address).pop();
  if (!mail) throw new Error(`no mail captured for ${address}`);
  return mail;
}

async function login(
  page: Page,
  pw: string,
  opts: { expectDeckList: boolean } = { expectDeckList: true },
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password (min 8 chars)", { exact: true }).fill(pw);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  if (opts.expectDeckList) {
    // Wait for the session before navigating on — otherwise a goto() races
    // the login round-trip and lands on the public page as a guest.
    await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();
  }
}

test("signup creates an account and lands on the deck list", async ({
  page,
}) => {
  await page.goto("/login?mode=signup");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password (min 8 chars)", { exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();
});

test("the emailed verification link verifies the address", async ({ page }) => {
  const mail = lastMailTo(email);
  const link = mail.text.match(/https?:\/\/\S+verify-email\S+/)?.[0];
  expect(link, "verification link present in the captured mail").toBeTruthy();
  await page.goto(link!);
  await expect(page.getByText(/verified/i).first()).toBeVisible();
});

test("a markdown deck can be created and studied", async ({ page }) => {
  await login(page, password);
  await page.getByRole("link", { name: "New deck" }).click();
  await page
    .getByRole("textbox")
    .last()
    .fill(
      "# E2E Deck\n## General\n**1. What is 2+2?**\n4.\n\n**2. Capital of France?**\nParis.\n",
    );
  await page.getByRole("button", { name: "Save deck" }).click();
  await expect(page.getByText("E2E Deck", { exact: true })).toBeVisible();

  // Study one card: reveal, grade it, and see the next card or the summary.
  await page.getByRole("link", { name: /study/i }).first().click();
  await page.getByRole("button", { name: "Show answer" }).click();
  await page.getByRole("button", { name: /^Good/ }).click();
  await expect(page.getByText(/2 \/ 2|complete/i).first()).toBeVisible();
});

test("changing the password re-issues the session", async ({ page }) => {
  await login(page, password);
  await page.goto("/settings");
  await page.getByLabel("Current password").fill(password);
  await page.getByLabel("New password (min 8 chars)").fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Password updated.")).toBeVisible();
});

test("2FA can be enabled from settings", async ({ page }) => {
  await login(page, newPassword);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Enable 2FA" }).click();

  // Grab the shared secret from the fallback URI so we can act as the
  // authenticator app.
  await page.getByText("Can't scan? Use this URI instead").click();
  const uri = await page.locator("details code").innerText();
  totpSecret = new URL(uri).searchParams.get("secret") ?? "";
  expect(totpSecret).not.toBe("");

  await page
    .getByLabel("6-digit code")
    .fill(await generate({ secret: totpSecret }));
  await page.getByRole("button", { name: "Verify & enable" }).click();

  // One-time backup codes are revealed.
  await expect(page.getByText(/backup codes now/i)).toBeVisible();
  await page.getByRole("button", { name: "I've saved them" }).click();
  await expect(page.getByText("On", { exact: true })).toBeVisible();
});

test("login now requires the TOTP code", async ({ page }) => {
  await login(page, newPassword, { expectDeckList: false });
  await expect(page.getByPlaceholder("Verification code")).toBeVisible();

  // Wrong code is rejected...
  await page.getByPlaceholder("Verification code").fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText(/invalid/i)).toBeVisible();

  // ...the real one signs in.
  await page
    .getByPlaceholder("Verification code")
    .fill(await generate({ secret: totpSecret }));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();
});

test("the data export downloads the account as JSON", async ({ page }) => {
  await login(page, newPassword, { expectDeckList: false });
  await page
    .getByPlaceholder("Verification code")
    .fill(await generate({ secret: totpSecret }));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();

  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data" }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(
    fs.readFileSync(await download.path(), "utf8"),
  ) as {
    profile: { email: string };
    decks: Array<{ title: string; cards: unknown[] }>;
  };
  expect(exported.profile.email).toBe(email);
  expect(exported.decks[0].title).toBe("E2E Deck");
  expect(exported.decks[0].cards).toHaveLength(2);
});

test("deleting the account removes everything and kills the login", async ({
  page,
}) => {
  await login(page, newPassword, { expectDeckList: false });
  await page
    .getByPlaceholder("Verification code")
    .fill(await generate({ secret: totpSecret }));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();

  await page.goto("/settings");
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByLabel("Current password").last().fill(newPassword);
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();

  // Back on the public landing page, logged out.
  await expect(page).toHaveURL(/\/$/);

  // The credentials are dead.
  await login(page, newPassword, { expectDeckList: false });
  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
});
