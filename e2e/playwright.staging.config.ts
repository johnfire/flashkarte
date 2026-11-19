import { defineConfig, devices } from "@playwright/test";

const origin = "https://staging.learnwohl.app";
const certPath = process.env.STAGING_TLS_CERT_PATH;
const keyPath = process.env.STAGING_TLS_KEY_PATH;
const inbox = process.env.STAGING_MAIL_URL;
if (
  !certPath ||
  !keyPath ||
  !inbox ||
  new URL(inbox).hostname !== "127.0.0.1"
) {
  throw new Error("Run the private staging suite through npm run test:staging");
}

export default defineConfig({
  testDir: __dirname,
  testMatch: "account-lifecycle.spec.ts",
  outputDir: ".artifacts/staging-results",
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: origin,
    clientCertificates: [{ origin, certPath, keyPath }],
    trace: "retain-on-failure",
  },
});
