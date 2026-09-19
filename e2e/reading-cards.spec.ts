import fs from "fs";
import path from "path";
import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { MAIL_SINK } from "./playwright.config";

// End-to-end coverage for reading cards (lessons): a lesson is read and
// acknowledged with "Got it", never rated, kept out of the review counts, and
// not offered again once read. The real server against a real Postgres serving
// the real built SPA, so this is also where the a11y of the reading screen is
// checked (contrast, roles, labels).

const DECK = [
  "# Reading E2E Deck",
  "## Basics",
  "@read",
  "**1. How a dot product measures similarity**",
  "A dot product multiplies matching entries and adds them up.",
  "",
  "- large and positive: the vectors point the same way",
  "- near zero: unrelated",
  "",
  "**2. What is 2 + 2?**",
  "Four.",
  "",
  "@read",
  "**3. Why softmax comes next**",
  "It turns scores into probabilities.",
  "",
].join("\n");

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

/** Decline analytics up front (the privacy-preserving choice) so the consent banner never covers the page. */
async function declineAnalytics(page: Page) {
  await page.addInitScript(() => {
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    localStorage.setItem(
      "flashkarte.analytics-consent",
      `rejected:${Date.now() + ninetyDays}`,
    );
  });
}

async function signUpVerifyAndSignIn(page: Page, email: string) {
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

test("a lesson is read with Got it, never rated, and is not offered again", async ({
  page,
}) => {
  await signUpVerifyAndSignIn(page, `e2e-reading-${Date.now()}@example.com`);

  await page.getByRole("link", { name: "New deck" }).click();
  await page.getByRole("textbox").last().fill(DECK);
  await page.getByRole("button", { name: "Save deck" }).click();
  await expect(
    page.getByText("Reading E2E Deck", { exact: true }),
  ).toBeVisible();

  // The deck list counts the question as the only reviewable card, and the two
  // lessons separately.
  await expect(page.getByText("1 card")).toBeVisible();
  await expect(page.getByText("2 lessons to read")).toBeVisible();

  await page.getByRole("link", { name: "Study", exact: true }).click();

  // First card: a lesson. Title and body, one Got it button, nothing to grade.
  await expect(
    page.getByRole("heading", {
      name: "How a dot product measures similarity",
    }),
  ).toBeVisible();
  await expect(page.getByText("- near zero: unrelated")).toBeVisible();
  await expect(page.getByRole("button", { name: "Got it" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Show answer/ })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Good" })).toHaveCount(0);

  const artifacts = path.dirname(MAIL_SINK);
  await page.screenshot({ path: path.join(artifacts, "reading-card.png") });

  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    violations.map(
      (v) =>
        `${v.id}: ${v.help}\n` +
        v.nodes
          .map((n) => `  ${n.target.join(" ")}: ${n.failureSummary}`)
          .join("\n"),
    ),
    "the reading screen has no WCAG A/AA violations",
  ).toEqual([]);

  await page.getByRole("button", { name: "Got it" }).click();

  // Next: an ordinary question, graded as usual.
  await expect(page.getByText("What is 2 + 2?")).toBeVisible();
  await page.getByRole("button", { name: /Show answer/ }).click();
  await page.getByRole("button", { name: "Good" }).click();

  // Then the second lesson.
  await expect(
    page.getByRole("heading", { name: "Why softmax comes next" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByText("Session complete")).toBeVisible();
  await expect(page.getByText("You reviewed 1 card.")).toBeVisible();

  // Both lessons are read now: the list no longer nags, and studying again does
  // not bring either lesson back.
  await page.goto("/");
  await expect(page.getByText("lessons to read")).toHaveCount(0);
  await page.getByRole("link", { name: "Study", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "How a dot product measures similarity",
    }),
  ).toHaveCount(0);
});
