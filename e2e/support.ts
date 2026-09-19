import fs from "fs";
import { expect, Page } from "@playwright/test";
import { MAIL_SINK } from "./playwright.config";

// Shared by the end-to-end specs: signing up a fresh account, and calling the API as that account.

export function lastMailTo(address: string): { text: string } {
  const lines = fs
    .readFileSync(MAIL_SINK, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as { to: string; text: string });
  const mail = lines.filter((m) => m.to === address).pop();
  if (!mail) throw new Error(`no mail captured for ${address}`);
  return mail;
}

/** Decline analytics up front (the privacy-preserving choice) so the consent banner never covers the page. */
export async function declineAnalytics(page: Page) {
  await page.addInitScript(() => {
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      "flashkarte.analytics-consent",
      `rejected:${Date.now() + ninetyDays}`,
    );
  });
}

export async function signUpVerifyAndSignIn(page: Page, email: string) {
  await declineAnalytics(page);
  const password = "E2ePassword-1";
  await page.goto("/login?mode=signup");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password (min 8 chars)", { exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();

  const link = lastMailTo(email).text.match(
    /https?:\/\/\S+verify-email\S+/,
  )?.[0];
  expect(link, "verification link present in the captured mail").toBeTruthy();
  await page.goto(link!);
  await expect(page.getByText(/verified/i).first()).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password (min 8 chars)", { exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();
}

/** The signed-in account's own API, for arranging data a spec then looks at through the UI. */
export async function apiAsSignedInUser(page: Page) {
  const token = await page.evaluate(async () => {
    const reply = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    return (await reply.json()).accessToken as string;
  });
  const headers = { Authorization: `Bearer ${token}` };
  return {
    async send(method: "GET" | "POST", path: string, data?: unknown) {
      const reply = await page.request.fetch(`/api${path}`, {
        method,
        headers,
        data,
      });
      expect(reply.ok(), `${method} ${path} -> ${reply.status()}`).toBe(true);
      return reply.status() === 204 ? null : await reply.json();
    },
  };
}
