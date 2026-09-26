// Real-Postgres regressions for the 2026-09-26 pre-deployment audit
// (docs/security-audit-2026-09-26.md, findings 1–3). Auth middleware is NOT
// mocked here: the point is to prove the real stack rejects these attacks.
import bcrypt from "bcryptjs";
import crypto from "crypto";
import request from "supertest";
import { generate, generateSecret } from "otplib";
import { createApp } from "../../app";
import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { encryptSecret } from "../../utils/secretBox";
import { verifyCode } from "../account/twoFactor.service";
import { resetPassword } from "./auth.service";

const USER_ID = "10000000-0000-4000-8000-0000000000a9";
const EMAIL = "audit-2fa@example.com";
const PASSWORD = "correct horse battery";
const app = createApp();

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "Auth security integration tests require POSTGRES_DB ending in _test",
    );
  }
  await runMigrations();
});
beforeEach(async () => {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash, email_verified_at)
     VALUES ($1, $2, $3, now())`,
    [USER_ID, EMAIL, await bcrypt.hash(PASSWORD, 4)],
  );
});
afterAll(async () => {
  await closePool();
});

// Open several pool connections up front. Otherwise the first concurrent
// request pays connection setup and the race windows below may never overlap,
// letting the pre-fix code pass by luck.
async function warmPool(): Promise<void> {
  await Promise.all(
    Array.from({ length: 6 }, () => getPool().query("SELECT pg_sleep(0.05)")),
  );
}

async function enableTwoFactor(backupCodes: string[]): Promise<string> {
  const secret = generateSecret();
  const hashes = await Promise.all(
    // Production cost: the audit's race only reproduced at cost 10.
    backupCodes.map((c) => bcrypt.hash(c, 10)),
  );
  await getPool().query(
    `UPDATE users SET two_factor_enabled = true, two_factor_secret_enc = $2,
            two_factor_backup = $3
      WHERE id = $1`,
    [USER_ID, encryptSecret(secret), hashes],
  );
  return secret;
}

describe("finding 1: a 2FA challenge is not an access token", () => {
  async function passwordOnlyChallenge(): Promise<string> {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.requiresTwoFactor).toBe(true);
    return res.body.challenge;
  }

  test("a password-only challenge cannot read the profile, product data, or create keys", async () => {
    await enableTwoFactor(["aaaaa-aaaaa"]);
    const challenge = await passwordOnlyChallenge();
    const bearer = `Bearer ${challenge}`;

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", bearer);
    expect(me.status).toBe(401);

    const decks = await request(app)
      .get("/api/decks")
      .set("Authorization", bearer);
    expect(decks.status).toBe(401);

    const key = await request(app)
      .post("/api/keys")
      .set("Authorization", bearer)
      .send({ name: "stolen", scope: "full" });
    expect(key.status).toBe(401);
    const keys = await getPool().query(
      "SELECT 1 FROM user_api_keys WHERE user_id = $1",
      [USER_ID],
    );
    expect(keys.rowCount).toBe(0);
  });

  test("the access token issued after the second factor works", async () => {
    const secret = await enableTwoFactor(["aaaaa-aaaaa"]);
    const challenge = await passwordOnlyChallenge();
    const done = await request(app)
      .post("/api/auth/2fa/verify")
      .send({ challenge, code: await generate({ secret }) });
    expect(done.status).toBe(200);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${done.body.accessToken}`);
    expect(me.status).toBe(200);
  });
});

describe("finding 2: password-reset links are single-use under concurrency", () => {
  async function insertResetToken(): Promise<string> {
    const raw = crypto.randomBytes(32).toString("hex");
    await getPool().query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, now() + interval '1 hour')`,
      [USER_ID, crypto.createHash("sha256").update(raw).digest("hex")],
    );
    return raw;
  }

  test("two concurrent resets with the same link yield exactly one success", async () => {
    const token = await insertResetToken();
    await warmPool();
    const results = await Promise.allSettled([
      resetPassword(token, "first-new-password"),
      resetPassword(token, "second-new-password"),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);

    const row = await getPool().query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [USER_ID],
    );
    const matches = await Promise.all(
      ["first-new-password", "second-new-password"].map((p) =>
        bcrypt.compare(p, row.rows[0].password_hash),
      ),
    );
    expect(matches.filter(Boolean)).toHaveLength(1);
    const left = await getPool().query(
      "SELECT 1 FROM password_reset_tokens WHERE user_id = $1",
      [USER_ID],
    );
    expect(left.rowCount).toBe(0);
  });

  test("a failed password update leaves the link usable", async () => {
    const token = await insertResetToken();
    const pool = getPool();
    // Force the UPDATE inside the reset transaction to fail.
    await pool.query(`
      CREATE OR REPLACE FUNCTION audit_fail_pw() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'forced failure'; END $$ LANGUAGE plpgsql`);
    await pool.query(
      `CREATE TRIGGER audit_fail_pw BEFORE UPDATE OF password_hash ON users
       FOR EACH ROW EXECUTE FUNCTION audit_fail_pw()`,
    );
    try {
      await expect(resetPassword(token, "new-password-1")).rejects.toThrow();
    } finally {
      await pool.query("DROP TRIGGER audit_fail_pw ON users");
      await pool.query("DROP FUNCTION audit_fail_pw()");
    }
    const left = await pool.query(
      "SELECT 1 FROM password_reset_tokens WHERE user_id = $1",
      [USER_ID],
    );
    expect(left.rowCount).toBe(1);
    await expect(resetPassword(token, "new-password-2")).resolves.toBe(USER_ID);
  });
});

describe("finding 3: backup codes are single-use under concurrency", () => {
  async function remainingBackupCount(): Promise<number> {
    const row = await getPool().query<{ n: number }>(
      "SELECT cardinality(two_factor_backup) AS n FROM users WHERE id = $1",
      [USER_ID],
    );
    return row.rows[0].n;
  }

  test("the same code used concurrently succeeds exactly once", async () => {
    await enableTwoFactor(["aaaaa-aaaaa", "bbbbb-bbbbb"]);
    await warmPool();
    const results = await Promise.all(
      Array.from({ length: 4 }, () => verifyCode(USER_ID, "aaaaa-aaaaa")),
    );
    expect(results.filter((r) => r === "backup")).toHaveLength(1);
    expect(await remainingBackupCount()).toBe(1);
  });

  test("different codes used concurrently are all consumed", async () => {
    await enableTwoFactor(["aaaaa-aaaaa", "bbbbb-bbbbb", "ccccc-ccccc"]);
    await warmPool();
    const results = await Promise.all([
      verifyCode(USER_ID, "aaaaa-aaaaa"),
      verifyCode(USER_ID, "bbbbb-bbbbb"),
    ]);
    expect(results).toEqual(["backup", "backup"]);
    expect(await remainingBackupCount()).toBe(1);
  });
});
