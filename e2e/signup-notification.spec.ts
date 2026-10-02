import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { test, expect } from "@playwright/test";
import { MAIL_SINK } from "./playwright.config";
import { declineAnalytics } from "./support";

const OWNER_EMAIL = "signup-notifications@example.com";

function capturedAlerts(signupEmail: string) {
  if (!fs.existsSync(MAIL_SINK)) return [];
  return fs
    .readFileSync(MAIL_SINK, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line) as { to: string; subject: string; text: string },
    )
    .filter(
      (mail) => mail.to === OWNER_EMAIL && mail.text.includes(signupEmail),
    );
}

function startNotificationWorker() {
  return spawn(process.execPath, ["packages/server/dist/email-worker.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      NODE_ENV: "test",
      POSTGRES_HOST: process.env.POSTGRES_HOST ?? "localhost",
      POSTGRES_PORT: process.env.POSTGRES_PORT ?? "5432",
      POSTGRES_DB: process.env.POSTGRES_DB ?? "flashkarte",
      POSTGRES_USER: process.env.POSTGRES_USER ?? "flashkarte",
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "flashkarte",
      MAIL_FILE_SINK: MAIL_SINK,
    },
    stdio: "ignore",
  });
}

test("web signup sends the owner an immediate alert through the real worker", async ({
  page,
}) => {
  const worker = startNotificationWorker();
  const signupEmail = `e2e-signup-alert-${Date.now()}@example.com`;
  try {
    await declineAnalytics(page);
    await page.goto("/login?mode=signup");
    await page.getByLabel("Email").fill(signupEmail);
    await page
      .getByLabel("Password (min 8 chars)", { exact: true })
      .fill("E2ePassword-1");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Verify your email to get started" }),
    ).toBeVisible();
    await expect
      .poll(() => capturedAlerts(signupEmail).length, { timeout: 10_000 })
      .toBe(1);
    expect(capturedAlerts(signupEmail)[0]).toMatchObject({
      to: OWNER_EMAIL,
      subject: "LearnWohl — new user signup",
    });
    expect(capturedAlerts(signupEmail)[0].text).toContain("pending at signup");
    expect(capturedAlerts(signupEmail)[0].text).not.toContain("E2ePassword-1");
  } finally {
    worker.kill();
  }
});
