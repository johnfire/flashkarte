import { closePool, getPool, withTransaction } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { logger } from "../../utils/logger";
import * as repository from "./promo.repository";
import * as service from "./promo.service";
import { signup } from "../auth/auth.service";
import { activateSignupPromo } from "./promo-signup.service";
import { getStatus, withUnitCreation } from "../billing/billing.service";
jest.mock("../../email/mailer", () => ({
  ...jest.requireActual("../../email/mailer"),
  sendVerificationEmail: jest.fn(),
}));

const ACTOR = { type: "user" as const, id: "promo-test-admin" };
const TEST_CODES = ["TEST_PROMO30", "TEST_PROMO_LAST", "TEST_PROMO_ROLLBACK"];
const TEST_EMAIL = "signup-promo-integration@example.com";

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test"))
    throw new Error("Promo tests require a database ending in _test");
  await runMigrations();
  process.env.JWT_SECRET ??= "insecure-promo-integration-" + "x".repeat(32);
});

beforeEach(async () => {
  await getPool().query("DELETE FROM users WHERE email = $1", [TEST_EMAIL]);
  await getPool().query(
    "DELETE FROM signup_promos WHERE code = ANY($1::text[])",
    [TEST_CODES],
  );
});

afterAll(async () => {
  await getPool().query("DELETE FROM users WHERE email = $1", [TEST_EMAIL]);
  await getPool().query(
    "DELETE FROM signup_promos WHERE code = ANY($1::text[])",
    [TEST_CODES],
  );
  await closePool();
});

test("stores promos and admin audit entries in the same transaction", async () => {
  const created = await logger.withCorrelationId("promo-test-correlation", () =>
    service.createPromo(
      {
        code: "test_promo30",
        kind: "free_access",
        freeDays: 30,
        maxActivations: 2,
      },
      ACTOR,
    ),
  );
  expect(created).toMatchObject({
    code: "TEST_PROMO30",
    freeDays: 30,
    active: true,
    activationCount: 0,
  });
  const audit = await getPool().query(
    "SELECT actor_type, actor_id, correlation_id FROM audit_log WHERE target_id = $1 AND action = 'admin.promo_created'",
    [created.id],
  );
  expect(audit.rows[0]).toMatchObject({
    actor_type: "user",
    actor_id: ACTOR.id,
    correlation_id: "promo-test-correlation",
  });
  await expect(
    service.createPromo(
      { code: "TEST_PROMO30", kind: "free_access", freeDays: 10 },
      ACTOR,
    ),
  ).rejects.toThrow("already exists");
});

test("preview omits admin counts and rejects paused and expired codes", async () => {
  const created = await service.createPromo(
    { code: "TEST_PROMO30", kind: "free_access", freeDays: 30 },
    ACTOR,
  );
  const preview = await service.previewPromo(" test_promo30 ");
  expect(preview).toMatchObject({ code: "TEST_PROMO30", freeDays: 30 });
  expect(preview).not.toHaveProperty("activationCount");
  expect(preview).not.toHaveProperty("stripeCouponId");
  await service.setPromoActive(created.id, false, ACTOR);
  await expect(service.previewPromo("TEST_PROMO30")).rejects.toThrow("paused");
  await service.setPromoActive(created.id, true, ACTOR);
  await getPool().query(
    "UPDATE signup_promos SET expires_at = now() - interval '1 second' WHERE id = $1",
    [created.id],
  );
  await expect(service.previewPromo("TEST_PROMO30")).rejects.toThrow("expired");
});

test("allows only one concurrent claim of the final activation", async () => {
  await service.createPromo(
    {
      code: "TEST_PROMO_LAST",
      kind: "free_access",
      freeDays: 30,
      maxActivations: 1,
    },
    ACTOR,
  );
  const attempts = await Promise.allSettled([
    withTransaction((client) =>
      repository.claimPromo(client, "TEST_PROMO_LAST"),
    ),
    withTransaction((client) =>
      repository.claimPromo(client, "TEST_PROMO_LAST"),
    ),
  ]);
  expect(
    attempts.filter((attempt) => attempt.status === "fulfilled"),
  ).toHaveLength(1);
  expect(
    attempts.filter((attempt) => attempt.status === "rejected"),
  ).toHaveLength(1);
  await expect(service.previewPromo("TEST_PROMO_LAST")).rejects.toThrow(
    "fully used",
  );
  const stored = await getPool().query(
    "SELECT activation_count FROM signup_promos WHERE code = 'TEST_PROMO_LAST'",
  );
  expect(stored.rows[0].activation_count).toBe(1);
});

test("rolls back a claimed activation if signup later fails", async () => {
  await service.createPromo(
    {
      code: "TEST_PROMO_ROLLBACK",
      kind: "free_access",
      freeDays: 30,
      maxActivations: 1,
    },
    ACTOR,
  );
  await expect(
    withTransaction(async (client) => {
      await repository.claimPromo(client, "TEST_PROMO_ROLLBACK");
      throw new Error("signup failed");
    }),
  ).rejects.toThrow("signup failed");
  await expect(
    service.previewPromo("TEST_PROMO_ROLLBACK"),
  ).resolves.toMatchObject({ code: "TEST_PROMO_ROLLBACK" });
});

test("signup grants temporary access and expiry restores the free limit without removing content", async () => {
  await service.createPromo(
    { code: "TEST_PROMO30", kind: "free_access", freeDays: 30 },
    ACTOR,
  );
  const registration = await signup(
    TEST_EMAIL,
    "StrongPassword-1",
    "test_promo30",
    "free",
  );
  const userId = registration.user.id;
  await expect(getStatus(userId)).resolves.toMatchObject({
    plan: "paid",
    accountType: "free",
    subscription: null,
    activeUnitLimit: null,
  });
  for (let index = 0; index < 11; index += 1) {
    await withUnitCreation(userId, (db) =>
      db.query("INSERT INTO decks (user_id, title) VALUES ($1, $2)", [
        userId,
        `promo deck ${index}`,
      ]),
    );
  }
  await getPool().query(
    "UPDATE signup_promo_activations SET access_expires_at = now() - interval '1 second' WHERE user_id = $1",
    [userId],
  );
  await expect(getStatus(userId)).resolves.toMatchObject({
    plan: "free",
    promoAccessEndsAt: null,
    activeUnitCount: 11,
    overLimit: true,
  });
  await expect(
    withUnitCreation(userId, (db) =>
      db.query("INSERT INTO decks (user_id, title) VALUES ($1, 'over limit')", [
        userId,
      ]),
    ),
  ).rejects.toThrow("10 active");
  const content = await getPool().query(
    "SELECT count(*)::int AS count FROM decks WHERE user_id = $1",
    [userId],
  );
  expect(content.rows[0].count).toBe(11);
});

test("invalid, paused and incompatible promos roll back account creation", async () => {
  const created = await service.createPromo(
    {
      code: "TEST_PROMO30",
      kind: "free_access",
      freeDays: 30,
      maxActivations: 1,
    },
    ACTOR,
  );
  await expect(
    signup(TEST_EMAIL, "StrongPassword-1", "TEST_PROMO30", "monthly"),
  ).rejects.toThrow("paid plan");
  await service.setPromoActive(created.id, false, ACTOR);
  await expect(
    signup(TEST_EMAIL, "StrongPassword-1", "TEST_PROMO30", "free"),
  ).rejects.toThrow("paused");
  const accounts = await getPool().query(
    "SELECT id FROM users WHERE email = $1",
    [TEST_EMAIL],
  );
  expect(accounts.rows).toHaveLength(0);
  await service.setPromoActive(created.id, true, ACTOR);
  await expect(service.previewPromo("TEST_PROMO30")).resolves.toMatchObject({
    code: "TEST_PROMO30",
  });
});

test("a saved signup discount is bound to the selected plan and disappears after a purchase", async () => {
  const coupon = await getPool().query<{
    id: string;
  }>(`INSERT INTO signup_promos
    (code, kind, percent_off, discount_duration, stripe_coupon_id, eligible_plan)
    VALUES ('TEST_PROMO30', 'discount', 20, 'once', 'test-coupon', 'yearly') RETURNING id`);
  const user = await getPool().query<{ id: string }>(
    "INSERT INTO users (email, password_hash) VALUES ($1, 'test-only') RETURNING id",
    [TEST_EMAIL],
  );
  const userId = user.rows[0].id;
  await withTransaction((client) =>
    activateSignupPromo(client, userId, "TEST_PROMO30", "yearly"),
  );
  await expect(
    repository.findSignupDiscount(userId, "monthly"),
  ).resolves.toBeUndefined();
  await expect(repository.findSignupDiscount(userId, "yearly")).resolves.toBe(
    "test-coupon",
  );
  await expect(getStatus(userId)).resolves.toMatchObject({
    plan: "free",
    signupDiscount: { code: "TEST_PROMO30", plan: "yearly", percentOff: 20 },
  });
  await getPool().query(
    `INSERT INTO billing_subscriptions (user_id, provider, provider_subscription_id, plan, status)
    VALUES ($1, 'stripe', $2, 'yearly', 'active')`,
    [userId, `promo-test-${coupon.rows[0].id}`],
  );
  await expect(
    repository.findSignupDiscount(userId, "yearly"),
  ).resolves.toBeUndefined();
});
