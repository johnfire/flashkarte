import { test, expect, Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Mechanical accessibility floor (§16): axe WCAG 2.0/2.1 A+AA checks on the
// core pages. Judgment-level a11y still belongs to review; this catches the
// regressions a machine can catch (contrast, labels, roles, landmarks).

const scan = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

function report(violations: Awaited<ReturnType<typeof scan>>["violations"]) {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n` +
        v.nodes.map((n) => `  ${n.target.join(" ")}`).join("\n"),
    )
    .join("\n");
}

// The old single "/guide" page was replaced by the /help centre; scanning
// "/guide" only exercised its redirect, so the help content went unchecked.
// Each topic page is listed explicitly — they carry inline links in prose,
// which is exactly the shape that trips link-in-text-block.
for (const [name, path] of [
  ["landing", "/"],
  ["auth", "/login"],
  ["signup", "/login?mode=signup"],
  ["help index", "/help"],
  ["help: getting started", "/help/getting-started"],
  ["help: writing decks", "/help/writing-decks"],
  ["help: branching decks", "/help/branching-decks"],
  ["help: studying", "/help/studying"],
  ["help: ai", "/help/ai"],
  ["help: sharing", "/help/sharing"],
  ["explore", "/explore"],
  ["privacy", "/privacy"],
] as const) {
  test(`axe: ${name} page has no WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { violations } = await scan(page);
    expect(violations, report(violations)).toEqual([]);
  });
}

test("axe: deck list and settings (authenticated)", async ({ page }) => {
  const email = `e2e-axe-${Date.now()}@example.com`;
  await page.goto("/login?mode=signup");
  await page.getByLabel("Email").fill(email);
  await page
    .getByLabel("Password (min 8 chars)", { exact: true })
    .fill("AxePassword-1");
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My Decks" })).toBeVisible();

  let { violations } = await scan(page);
  expect(violations, report(violations)).toEqual([]);

  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  ({ violations } = await scan(page));
  expect(violations, report(violations)).toEqual([]);
});
