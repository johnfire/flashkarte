import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { createCampaign, upsertRecipients } from "./shared-email.service";
import * as repository from "./shared-email.repository";
import type { SharedEmailTenant } from "./shared-email.types";

const TENANT: SharedEmailTenant = {
  slug: "notes-world-test",
  fromAddress: "notes@example.com",
  replyTo: null,
};

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "Shared email integration tests require POSTGRES_DB ending in _test",
    );
  }
  await runMigrations();
});

beforeEach(async () => {
  const pool = getPool();
  await pool.query(
    "DELETE FROM email_service_campaigns WHERE tenant_slug = $1",
    [TENANT.slug],
  );
  await pool.query("DELETE FROM email_service_tenants WHERE slug = $1", [
    TENANT.slug,
  ]);
});

afterAll(closePool);

test("creates a tenant-scoped transactional delivery snapshot", async () => {
  await upsertRecipients(TENANT, [
    {
      externalUserId: "notes-user-1",
      email: "recipient@example.com",
      emailVerified: false,
    },
  ]);

  const campaign = await createCampaign(TENANT, {
    category: "transactional",
    subject: "Your account update",
    textBody: "The update is ready.",
    recipientExternalIds: ["notes-user-1"],
  });

  const delivery = await getPool().query(
    `
      SELECT recipient_external_id, recipient_email, state
      FROM email_service_deliveries
      WHERE campaign_id = $1
    `,
    [campaign.id],
  );
  expect(delivery.rows).toEqual([
    {
      recipient_external_id: "notes-user-1",
      recipient_email: "recipient@example.com",
      state: "pending",
    },
  ]);
});

test("requires product-update opt-in", async () => {
  await upsertRecipients(TENANT, [
    {
      externalUserId: "notes-user-2",
      email: "recipient@example.com",
      emailVerified: true,
    },
  ]);

  await expect(
    createCampaign(TENANT, {
      category: "product_update",
      subject: "Release notes",
      textBody: "New features are available.",
      recipientExternalIds: ["notes-user-2"],
    }),
  ).rejects.toThrow("Every recipient must be active and eligible");
});

test("claims shared deliveries atomically", async () => {
  await upsertRecipients(TENANT, [
    {
      externalUserId: "notes-user-3",
      email: "recipient@example.com",
      emailVerified: true,
    },
  ]);
  await createCampaign(TENANT, {
    category: "service_announcement",
    subject: "Maintenance",
    textBody: "Maintenance tonight.",
    recipientExternalIds: ["notes-user-3"],
  });

  const claimed = await repository.claimNextDelivery("shared-worker-a");
  const secondClaim = await repository.claimNextDelivery("shared-worker-b");

  expect(claimed).toMatchObject({
    tenantSlug: TENANT.slug,
    recipientEmail: "recipient@example.com",
    attemptCount: 1,
  });
  expect(secondClaim).toBeNull();
});
