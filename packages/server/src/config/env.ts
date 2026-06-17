import crypto from "crypto";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}

const PLACEHOLDER_SECRETS = new Set([
  "change-me",
  "change-me-to-a-long-random-string",
  "dev-insecure-secret-change-me",
]);

// A signing secret must be strong: a short or placeholder value yields
// trivially forgeable HS256 tokens.
function assertStrongSecret(name: string, value: string): void {
  if (value.length < 32 || PLACEHOLDER_SECRETS.has(value)) {
    throw new Error(
      `${name} must be a strong random value (>= 32 chars, not a placeholder)`,
    );
  }
}

export function validateEnv() {
  const NODE_ENV = process.env.NODE_ENV ?? "development";
  if (NODE_ENV === "production") {
    assertStrongSecret("JWT_SECRET", required("JWT_SECRET"));
    required("CORS_ORIGIN");
    required("POSTGRES_PASSWORD");
  }
  return {
    NODE_ENV,
    PORT: parseInt(process.env.PORT ?? "3001", 10),
  };
}

// Per-process random dev fallback — never a shared, attacker-known constant, so
// a non-prod deploy that forgot JWT_SECRET still can't have its tokens forged
// (they simply don't survive a restart). Production must set JWT_SECRET.
let devSecret: string | null = null;
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if ((process.env.NODE_ENV ?? "development") === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  if (!devSecret) devSecret = crypto.randomBytes(32).toString("hex");
  return devSecret;
}
