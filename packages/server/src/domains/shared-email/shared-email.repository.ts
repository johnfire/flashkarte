import type { PoolClient } from "pg";
import { query, queryOne } from "../../db/client";
import type {
  ClaimedSharedEmailDelivery,
  SharedEmailCampaignStatus,
  SharedEmailCategory,
  SharedEmailCampaignSummary,
  SharedEmailRecipientInput,
  SharedEmailTenant,
} from "./shared-email.types";

interface CampaignRow {
  id: string;
  status: SharedEmailCampaignStatus;
  category: SharedEmailCategory;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: Date;
}

interface RecipientRow {
  external_user_id: string;
  email: string;
  display_name: string | null;
  email_verified: boolean;
  service_announcements_opt_in: boolean;
  product_updates_opt_in: boolean;
  active: boolean;
  suppressed_at: Date | null;
}

interface DeliveryRow {
  id: string;
  campaign_id: string;
  tenant_slug: string;
  from_address: string;
  reply_to: string | null;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  text_body: string;
  html_body: string;
  attempt_count: number;
}

function toClaimedDelivery(row: DeliveryRow): ClaimedSharedEmailDelivery {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    tenantSlug: row.tenant_slug,
    fromAddress: row.from_address,
    replyTo: row.reply_to,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    subject: row.subject,
    textBody: row.text_body,
    htmlBody: row.html_body,
    attemptCount: row.attempt_count,
  };
}

function toCampaignSummary(row: CampaignRow): SharedEmailCampaignSummary {
  return {
    id: row.id,
    status: row.status,
    category: row.category,
    recipientCount: row.recipient_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdAt: row.created_at.toISOString(),
  };
}

export async function ensureTenant(
  client: PoolClient,
  tenant: SharedEmailTenant,
): Promise<void> {
  await client.query(
    `
      INSERT INTO email_service_tenants (slug, from_address, reply_to)
      VALUES ($1, $2, $3)
      ON CONFLICT (slug) DO UPDATE
        SET from_address = EXCLUDED.from_address,
            reply_to = EXCLUDED.reply_to,
            enabled = true,
            updated_at = now()
    `,
    [tenant.slug, tenant.fromAddress, tenant.replyTo],
  );
}

export async function upsertRecipient(
  client: PoolClient,
  tenantSlug: string,
  recipient: SharedEmailRecipientInput,
): Promise<void> {
  await client.query(
    `
      INSERT INTO email_service_recipients (
        tenant_slug, external_user_id, email, display_name, email_verified,
        service_announcements_opt_in, product_updates_opt_in
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_slug, external_user_id) DO UPDATE
        SET email = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            email_verified = EXCLUDED.email_verified,
            service_announcements_opt_in = EXCLUDED.service_announcements_opt_in,
            product_updates_opt_in = EXCLUDED.product_updates_opt_in,
            active = true,
            suppressed_at = NULL,
            suppression_reason = NULL,
            updated_at = now()
    `,
    [
      tenantSlug,
      recipient.externalUserId,
      recipient.email,
      recipient.displayName ?? null,
      recipient.emailVerified ?? false,
      recipient.serviceAnnouncementsOptIn ?? true,
      recipient.productUpdatesOptIn ?? false,
    ],
  );
}

export async function deactivateRecipient(
  tenantSlug: string,
  externalUserId: string,
): Promise<void> {
  await query(
    `
      UPDATE email_service_recipients
      SET active = false, updated_at = now()
      WHERE tenant_slug = $1 AND external_user_id = $2
    `,
    [tenantSlug, externalUserId],
  );
}

export async function findEligibleRecipients(
  client: PoolClient,
  tenantSlug: string,
  category: SharedEmailCategory,
  externalUserIds: string[],
): Promise<RecipientRow[]> {
  const eligibility =
    category === "transactional"
      ? "active AND suppressed_at IS NULL"
      : category === "service_announcement"
        ? "active AND suppressed_at IS NULL AND email_verified AND service_announcements_opt_in"
        : "active AND suppressed_at IS NULL AND email_verified AND product_updates_opt_in";
  const result = await client.query<RecipientRow>(
    `
      SELECT external_user_id, email, display_name, email_verified,
             service_announcements_opt_in, product_updates_opt_in,
             active, suppressed_at
      FROM email_service_recipients
      WHERE tenant_slug = $1
        AND external_user_id = ANY($2::text[])
        AND ${eligibility}
      ORDER BY external_user_id ASC
    `,
    [tenantSlug, externalUserIds],
  );
  return result.rows;
}

export async function createCampaign(
  client: PoolClient,
  input: {
    tenant: SharedEmailTenant;
    category: SharedEmailCategory;
    createdBy: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    recipients: RecipientRow[];
  },
): Promise<SharedEmailCampaignSummary> {
  const campaignResult = await client.query<CampaignRow>(
    `
      INSERT INTO email_service_campaigns (
        tenant_slug, category, from_address, reply_to, subject, text_body,
        html_body, created_by, recipient_count
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, status, category, recipient_count, sent_count,
                failed_count, created_at
    `,
    [
      input.tenant.slug,
      input.category,
      input.tenant.fromAddress,
      input.tenant.replyTo,
      input.subject,
      input.textBody,
      input.htmlBody,
      input.createdBy,
      input.recipients.length,
    ],
  );
  const campaign = campaignResult.rows[0];
  for (const recipient of input.recipients) {
    await client.query(
      `
        INSERT INTO email_service_deliveries (
          campaign_id, recipient_external_id, recipient_email, recipient_name
        )
        VALUES ($1, $2, $3, $4)
      `,
      [
        campaign.id,
        recipient.external_user_id,
        recipient.email,
        recipient.display_name,
      ],
    );
  }
  return toCampaignSummary(campaign);
}

export async function getCampaign(
  tenantSlug: string,
  campaignId: string,
): Promise<SharedEmailCampaignSummary | null> {
  const row = await queryOne<CampaignRow>(
    `
      SELECT id, status, category, recipient_count, sent_count,
             failed_count, created_at
      FROM email_service_campaigns
      WHERE tenant_slug = $1 AND id = $2
    `,
    [tenantSlug, campaignId],
  );
  return row ? toCampaignSummary(row) : null;
}

export async function claimNextDelivery(
  workerId: string,
): Promise<ClaimedSharedEmailDelivery | null> {
  await recoverExhaustedLeases();
  const row = await queryOne<DeliveryRow>(
    `
      WITH candidate AS (
        SELECT d.id
        FROM email_service_deliveries d
        JOIN email_service_campaigns c ON c.id = d.campaign_id
        WHERE c.status IN ('queued', 'sending')
          AND (
            (d.state = 'pending' AND d.next_attempt_at <= now())
            OR (
              d.state = 'sending'
              AND d.claimed_at < now() - interval '5 minutes'
              AND d.attempt_count < 5
            )
          )
        ORDER BY d.created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      ), claimed AS (
        UPDATE email_service_deliveries d
        SET state = 'sending', claimed_at = now(), claimed_by = $1,
            attempt_count = d.attempt_count + 1
        FROM candidate
        WHERE d.id = candidate.id
        RETURNING d.id, d.campaign_id, d.recipient_email, d.recipient_name,
                  d.attempt_count
      )
      SELECT claimed.id, claimed.campaign_id, c.tenant_slug,
             c.from_address, c.reply_to, claimed.recipient_email,
             claimed.recipient_name, c.subject, c.text_body, c.html_body,
             claimed.attempt_count
      FROM claimed
      JOIN email_service_campaigns c ON c.id = claimed.campaign_id
    `,
    [workerId],
  );
  if (!row) return null;
  await query(
    `
      UPDATE email_service_campaigns
      SET status = 'sending', started_at = COALESCE(started_at, now())
      WHERE id = $1 AND status = 'queued'
    `,
    [row.campaign_id],
  );
  return toClaimedDelivery(row);
}

async function recoverExhaustedLeases(): Promise<void> {
  const recovered = await query<{ campaign_id: string }>(
    `
      UPDATE email_service_deliveries
      SET state = 'failed', last_error = 'Worker lease expired after the retry limit'
      WHERE state = 'sending'
        AND claimed_at < now() - interval '5 minutes'
        AND attempt_count >= 5
      RETURNING campaign_id
    `,
  );
  for (const campaign of new Set(recovered.map((row) => row.campaign_id))) {
    await refreshCampaignState(campaign);
  }
}

export async function markDeliverySent(
  deliveryId: string,
  campaignId: string,
  messageId: string | undefined,
): Promise<void> {
  await query(
    `
      UPDATE email_service_deliveries
      SET state = 'sent', sent_at = now(), smtp_message_id = $2,
          last_error = NULL
      WHERE id = $1 AND state = 'sending'
    `,
    [deliveryId, messageId ?? null],
  );
  await refreshCampaignState(campaignId);
}

export async function markDeliveryFailed(
  deliveryId: string,
  campaignId: string,
  attemptCount: number,
  errorMessage: string,
): Promise<void> {
  const shouldRetry = attemptCount < 5;
  const retryDelaySeconds = Math.min(60 * 2 ** (attemptCount - 1), 3_600);
  await query(
    `
      UPDATE email_service_deliveries
      SET state = $2,
          next_attempt_at = CASE WHEN $2 = 'pending'
            THEN now() + ($3 * interval '1 second') ELSE next_attempt_at END,
          last_error = $4
      WHERE id = $1 AND state = 'sending'
    `,
    [
      deliveryId,
      shouldRetry ? "pending" : "failed",
      retryDelaySeconds,
      errorMessage.slice(0, 2_000),
    ],
  );
  await refreshCampaignState(campaignId);
}

async function refreshCampaignState(campaignId: string): Promise<void> {
  await query(
    `
      UPDATE email_service_campaigns c
      SET sent_count = counts.sent_count,
          failed_count = counts.failed_count,
          status = CASE
            WHEN counts.pending_count > 0 OR counts.sending_count > 0 THEN 'sending'
            WHEN counts.failed_count > 0 THEN 'failed'
            ELSE 'completed'
          END,
          completed_at = CASE
            WHEN counts.pending_count = 0 AND counts.sending_count = 0
            THEN COALESCE(c.completed_at, now())
            ELSE c.completed_at
          END
      FROM (
        SELECT
          count(*) FILTER (WHERE state = 'sent')::integer AS sent_count,
          count(*) FILTER (WHERE state = 'failed')::integer AS failed_count,
          count(*) FILTER (WHERE state = 'pending')::integer AS pending_count,
          count(*) FILTER (WHERE state = 'sending')::integer AS sending_count
        FROM email_service_deliveries
        WHERE campaign_id = $1
      ) counts
      WHERE c.id = $1
    `,
    [campaignId],
  );
}
