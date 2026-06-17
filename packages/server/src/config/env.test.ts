import { describe, test, expect, afterEach } from "@jest/globals";

const KEYS = [
  "NODE_ENV",
  "JWT_SECRET",
  "CORS_ORIGIN",
  "POSTGRES_PASSWORD",
] as const;
const SAVED = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    const v = SAVED[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  jest.resetModules();
});

function load(over: Record<string, string | undefined>) {
  jest.resetModules();
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("./env") as typeof import("./env");
}

const STRONG = "x".repeat(40);

describe("getJwtSecret (AUTH-001)", () => {
  test("throws in production when JWT_SECRET is unset", () => {
    const { getJwtSecret } = load({ NODE_ENV: "production", JWT_SECRET: "" });
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });

  test("never falls back to a shared hardcoded secret outside production", () => {
    const { getJwtSecret } = load({ NODE_ENV: "test", JWT_SECRET: "" });
    const secret = getJwtSecret();
    expect(secret).not.toBe("dev-insecure-secret-change-me");
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  test("uses JWT_SECRET when provided", () => {
    const { getJwtSecret } = load({ NODE_ENV: "test", JWT_SECRET: STRONG });
    expect(getJwtSecret()).toBe(STRONG);
  });
});

describe("validateEnv JWT_SECRET strength (AUTH-002)", () => {
  const base = { CORS_ORIGIN: "https://x", POSTGRES_PASSWORD: "pw" };

  test("rejects a placeholder JWT_SECRET in production", () => {
    const { validateEnv } = load({
      NODE_ENV: "production",
      JWT_SECRET: "change-me-to-a-long-random-string",
      ...base,
    });
    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  test("rejects a too-short JWT_SECRET in production", () => {
    const { validateEnv } = load({
      NODE_ENV: "production",
      JWT_SECRET: "short",
      ...base,
    });
    expect(() => validateEnv()).toThrow(/JWT_SECRET/);
  });

  test("accepts a strong JWT_SECRET in production", () => {
    const { validateEnv } = load({
      NODE_ENV: "production",
      JWT_SECRET: STRONG,
      ...base,
    });
    expect(() => validateEnv()).not.toThrow();
  });
});
