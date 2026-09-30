import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import * as repository from "./email.repository";
import { contactUsers } from "./email.service";

const ADMIN_ID = "51000000-0000-4000-8000-000000000001";
const VERIFIED_USER_ID = "51000000-0000-4000-8000-000000000002";
const UNVERIFIED_USER_ID = "51000000-0000-4000-8000-000000000003";

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "Email integration tests require POSTGRES_DB ending in _test",
    );
  }
  await runMigrations();
});

beforeEach(async () => {
  const pool = getPool();
  await pool.query("DELETE FROM email_campaigns");
  await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [
    [ADMIN_ID, VERIFIED_USER_ID, UNVERIFIED_USER_ID],
  ]);
  await pool.query(
    `
      INSERT INTO users (id, email, password_hash, account_type, email_verified_at)
      VALUES
        ($1, 'email-admin@example.com', 'not-used', 'admin', now()),
        ($2, 'verified-recipient@example.com', 'not-used', 'free', now()),
        ($3, 'unverified-recipient@example.com', 'not-used', 'free', NULL)
    `,
    [ADMIN_ID, VERIFIED_USER_ID, UNVERIFIED_USER_ID],
  );
});

afterAll(closePool);

test("queues only verified recipients and preserves the snapshot", async () => {
  const campaign = await contactUsers(
    ADMIN_ID,
    "Service update",
    "The service will be unavailable tonight.",
    [VERIFIED_USER_ID],
  );

  expect(campaign).toMatchObject({
    status: "queued",
    recipientCount: 1,
    sentCount: 0,
    failedCount: 0,
  });
  const delivery = await getPool().query(
    `
      SELECT recipient_email, state
      FROM email_deliveries
      WHERE campaign_id = $1
    `,
    [campaign.id],
  );
  expect(delivery.rows).toEqual([
    { recipient_email: "verified-recipient@example.com", state: "pending" },
  ]);
});

test("rejects a campaign that includes an unverified recipient", async () => {
  await expect(
    contactUsers(ADMIN_ID, "Service update", "Body", [
      VERIFIED_USER_ID,
      UNVERIFIED_USER_ID,
    ]),
  ).rejects.toThrow(
    "Every selected recipient must be an existing, verified user",
  );

  const campaigns = await getPool().query(
    "SELECT count(*)::integer AS count FROM email_campaigns",
  );
  expect(campaigns.rows[0].count).toBe(0);
});

test("claims one delivery atomically for the worker", async () => {
  const campaign = await contactUsers(ADMIN_ID, "Service update", "Body", [
    VERIFIED_USER_ID,
  ]);

  const claimed = await repository.claimNextDelivery("worker-a");
  const secondClaim = await repository.claimNextDelivery("worker-b");

  expect(claimed).toMatchObject({
    campaignId: campaign.id,
    recipientEmail: "verified-recipient@example.com",
    attemptCount: 1,
  });
  expect(secondClaim).toBeNull();
});
