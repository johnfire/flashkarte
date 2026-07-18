import { closePool, getPool } from "./client";
import { runMigrations } from "./migrate";

const LEGACY_USER_ID = "90000000-0000-4000-8000-000000000035";
const MIGRATION_NAME = "016_enforce_email_verification.sql";

function assertSafeIntegrationDatabase(): void {
  const databaseName = process.env.POSTGRES_DB ?? "";
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Email verification integration tests require POSTGRES_DB ending in _test",
    );
  }
}

beforeAll(async () => {
  assertSafeIntegrationDatabase();
  await runMigrations();
});

afterAll(async () => {
  const pool = getPool();
  await pool.query("DELETE FROM users WHERE id = $1", [LEGACY_USER_ID]);
  await closePool();
});

test("the enforcement migration grandfathers an existing unverified account", async () => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO users (id, email, password_hash)
     VALUES ($1, 'legacy-unverified@example.com', 'not-used')`,
    [LEGACY_USER_ID],
  );
  await pool.query("DELETE FROM _migrations WHERE name = $1", [MIGRATION_NAME]);

  await runMigrations();

  const account = await pool.query<{ email_verified_at: Date | null }>(
    "SELECT email_verified_at FROM users WHERE id = $1",
    [LEGACY_USER_ID],
  );
  expect(account.rows[0].email_verified_at).toBeInstanceOf(Date);
});
