import fs from "fs";
import { test, expect } from "@playwright/test";
import { MAIL_SINK } from "./playwright.config";

// End-to-end coverage for editing an existing card in place (front/back/
// category), the flow that used to require deleting and recreating a card
// (losing its study progress) because no per-card edit endpoint existed.

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

test("editing a card's front, back, and category persists the change", async ({
  page,
}) => {
  const email = `e2e-edit-card-${Date.now()}@example.com`;
  const password = "E2ePassword-1";

  await page.goto("/login?mode=signup");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password (min 8 chars)", { exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();

  const link = lastMailTo(email).text.match(/https?:\/\/\S+verify-email\S+/)?.[0];
  expect(link, "verification link present in the captured mail").toBeTruthy();
  await page.goto(link!);
  await expect(page.getByText(/verified/i).first()).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password (min 8 chars)", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();

  await page.getByRole("link", { name: "New deck" }).click();
  await page
    .getByRole("textbox")
    .last()
    .fill("# Edit E2E Deck\n**1. What is 2+2?**\n4.\n");
  await page.getByRole("button", { name: "Save deck" }).click();
  await expect(page.getByText("Edit E2E Deck", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Manage", exact: true }).click();
  await expect(page.getByText("What is 2+2?")).toBeVisible();
  await page.getByText("What is 2+2?").click();

  await expect(page.getByRole("heading", { name: "Edit card" })).toBeVisible();
  const fields = page.getByRole("textbox");
  await fields.nth(0).fill("What is two plus two?");
  await fields.nth(1).fill("Four.");
  await fields.nth(2).fill("Math");
  await page.getByRole("button", { name: "Save" }).click();

  // Save navigates back to the card list — the edited front and its new
  // category are visible there without a reload.
  await expect(
    page.getByRole("heading", { name: /Cards in/ }),
  ).toBeVisible();
  await expect(page.getByText("What is two plus two?")).toBeVisible();
  await expect(page.getByText("Math", { exact: true })).toBeVisible();

  // Re-opening the card confirms the back text and category were persisted
  // server-side, not just held in local component state.
  await page.getByText("What is two plus two?").click();
  await expect(page.getByRole("heading", { name: "Edit card" })).toBeVisible();
  const reopenedFields = page.getByRole("textbox");
  await expect(reopenedFields.nth(0)).toHaveValue("What is two plus two?");
  await expect(reopenedFields.nth(1)).toHaveValue("Four.");
  await expect(reopenedFields.nth(2)).toHaveValue("Math");
});
