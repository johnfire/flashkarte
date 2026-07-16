import path from "path";
import fs from "fs";
import { defineConfig, devices } from "@playwright/test";

// E2E tier (§9.0): the real server binary against a real Postgres, serving
// the real built SPA — the seams the mock-based unit/route tests can't cover.
//
// Prerequisites (CI does these as explicit steps):
//   npm run build -w packages/shared -w packages/server -w packages/web
//   cp -r packages/web/dist packages/server/public
//   Postgres reachable (defaults match the CI service container).

export const MAIL_SINK = path.join(__dirname, ".artifacts", "mail-sink.jsonl");
const artifactsDir = path.dirname(MAIL_SINK);
fs.mkdirSync(artifactsDir, { recursive: true });
// Fresh sink per run so tests never read a previous run's mail.
fs.rmSync(MAIL_SINK, { force: true });

const PORT = 8090;

export default defineConfig({
  testDir: __dirname,
  outputDir: path.join(artifactsDir, "test-results"),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "node packages/server/dist/server.js",
    cwd: path.join(__dirname, ".."),
    port: PORT,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      POSTGRES_HOST: process.env.POSTGRES_HOST ?? "localhost",
      POSTGRES_PORT: process.env.POSTGRES_PORT ?? "5432",
      POSTGRES_DB: process.env.POSTGRES_DB ?? "flashkarte",
      POSTGRES_USER: process.env.POSTGRES_USER ?? "flashkarte",
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? "flashkarte",
      JWT_SECRET: "e2e-test-jwt-secret-0123456789abcdef0123456789",
      TWO_FACTOR_SECRET_KEY: "e2e-test-2fa-key-0123456789abcdef0123456789",
      CORS_ORIGIN: `http://localhost:${PORT}`,
      APP_URL: `http://localhost:${PORT}`,
      MAIL_FILE_SINK: MAIL_SINK,
      // The suite drives dozens of real logins/refreshes from one IP; keep
      // the limiter middleware active but out of the way.
      RATE_LIMIT_AUTH: "1000",
      RATE_LIMIT_2FA: "1000",
      RATE_LIMIT_API: "5000",
    },
  },
});
