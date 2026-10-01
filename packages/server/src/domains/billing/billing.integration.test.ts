import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { assertCanCreateUnit, getStatus } from "./billing.service";
import * as repository from "./billing.repository";

const EMAIL = "billing-test@example.com";
let userId = "";

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "Billing integration tests require POSTGRES_DB ending in _test",
    );
  }
  await runMigrations();
});

beforeEach(async () => {
  await getPool().query("DELETE FROM users WHERE email = $1 RETURNING id", [
    EMAIL,
  ]);
  const created = await getPool().query<{ id: string }>(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, 'test-only') RETURNING id`,
    [EMAIL],
  );
  userId = created.rows[0].id;
});

afterEach(async () => {
  if (!userId) return;
  await getPool().query("DELETE FROM users WHERE id = $1", [userId]);
});

afterAll(closePool);

test("counts a legacy course once and a course collection once", async () => {
  const pool = getPool();
  const standaloneDeck = await pool.query<{ id: string }>(
    "INSERT INTO decks (user_id, title) VALUES ($1, 'standalone') RETURNING id",
    [userId],
  );
  const course = await pool.query<{ id: string }>(
    "INSERT INTO courses (user_id, title) VALUES ($1, 'course') RETURNING id",
    [userId],
  );
  const courseDeck = await pool.query<{ id: string }>(
    "INSERT INTO decks (user_id, title) VALUES ($1, 'course deck') RETURNING id",
    [userId],
  );
  await pool.query(
    "INSERT INTO course_decks (course_id, deck_id, position) VALUES ($1, $2, 0)",
    [course.rows[0].id, courseDeck.rows[0].id],
  );
  const collection = await pool.query<{ id: string }>(
    "INSERT INTO course_collections (title) VALUES ('billing collection') RETURNING id",
  );
  const subject = await pool.query<{ id: string }>(
    `INSERT INTO subjects (user_id, title, is_public, course_collection_id)
     VALUES ($1, 'structured', true, $2) RETURNING id`,
    [userId, collection.rows[0].id],
  );
  await pool.query(
    "INSERT INTO subject_enrollments (user_id, subject_id) VALUES ($1, $2)",
    [userId, subject.rows[0].id],
  );

  await expect(repository.countActiveUnits(userId)).resolves.toBe(3);
  expect(standaloneDeck.rows[0].id).toBeTruthy();
});

test("rejects the eleventh free unit and preserves over-limit access", async () => {
  const pool = getPool();
  for (let i = 0; i < 10; i += 1) {
    await pool.query("INSERT INTO decks (user_id, title) VALUES ($1, $2)", [
      userId,
      `deck ${i}`,
    ]);
  }
  await expect(assertCanCreateUnit(userId)).rejects.toMatchObject({
    context: { code: "PLAN_LIMIT_REACHED", activeUnitCount: 10 },
  });
  await pool.query("INSERT INTO decks (user_id, title) VALUES ($1, 'legacy')", [
    userId,
  ]);
  await expect(getStatus(userId)).resolves.toMatchObject({
    plan: "free",
    activeUnitCount: 11,
    overLimit: true,
  });
});

test("a current provider subscription grants unlimited access", async () => {
  await repository.upsertSubscription({
    userId,
    provider: "google_play",
    providerSubscriptionId: "test-token",
    plan: "monthly",
    status: "active",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 86_400_000).toISOString(),
    cancelAtPeriodEnd: false,
    providerPayload: { test: true },
  });

  await expect(getStatus(userId)).resolves.toMatchObject({
    plan: "paid",
    activeUnitLimit: null,
  });
});
