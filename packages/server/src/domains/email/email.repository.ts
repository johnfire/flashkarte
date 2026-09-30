import type { PoolClient } from "pg";
import { query, queryOne } from "../../db/client";
import type {
  ClaimedEmailDelivery,
  EligibleRecipient,
  EmailCampaignStatus,
  EmailCampaignSummary,
} from "./email.types";

interface EmailCampaignRow {
  id: string;
  status: EmailCampaignStatus;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  created_at: Date;
}

interface EligibleRecipientRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface DeliveryRow {
  id: string;
  campaign_id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  text_body: string;
  html_body: string;
  attempt_count: number;
}

function toCampaignSummary(row: EmailCampaignRow): EmailCampaignSummary {
  return {
    id: row.id,
    status: row.status,
    recipientCount: row.recipient_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
    createdAt: row.created_at.toISOString(),
  };
}

function toRecipient(row: EligibleRecipientRow): EligibleRecipient {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
  };
}

function toDelivery(row: DeliveryRow): ClaimedEmailDelivery {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    recipientEmail: row.recipient_email,
    recipientName: row.recipient_name,
    subject: row.subject,
    textBody: row.text_body,
    htmlBody: row.html_body,
    attemptCount: row.attempt_count,
  };
}

export function findEligibleRecipients(
  userIds: string[],
  client?: PoolClient,
): Promise<EligibleRecipient[]> {
  const sql = `
    SELECT id, email, display_name
    FROM users
    WHERE id = ANY($1::uuid[])
      AND email_verified_at IS NOT NULL
    ORDER BY created_at ASC
  `;
  if (client) {
    return client
      .query<EligibleRecipientRow>(sql, [userIds])
      .then((result) => result.rows.map(toRecipient));
  }
  return query<EligibleRecipientRow>(sql, [userIds]).then((rows) =>
    rows.map(toRecipient),
  );
}

export async function createCampaign(
  client: PoolClient,
  input: {
    createdBy: string;
    subject: string;
    textBody: string;
    htmlBody: string;
    recipientCount: number;
  },
): Promise<EmailCampaignSummary> {
  const result = await client.query<EmailCampaignRow>(
    `
      INSERT INTO email_campaigns
        (created_by, subject, text_body, html_body, recipient_count)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, status, recipient_count, sent_count, failed_count, created_at
    `,
    [
      input.createdBy,
      input.subject,
      input.textBody,
      input.htmlBody,
      input.recipientCount,
    ],
  );
  return toCampaignSummary(result.rows[0]);
}

export async function createDeliveries(
  client: PoolClient,
  campaignId: string,
  recipients: EligibleRecipient[],
): Promise<void> {
  for (const recipient of recipients) {
    await client.query(
      `
        INSERT INTO email_deliveries
          (campaign_id, user_id, recipient_email, recipient_name)
        VALUES ($1, $2, $3, $4)
      `,
      [campaignId, recipient.id, recipient.email, recipient.displayName],
    );
  }
}

export async function getCampaign(
  campaignId: string,
): Promise<EmailCampaignSummary | null> {
  const row = await queryOne<EmailCampaignRow>(
    `
      SELECT id, status, recipient_count, sent_count, failed_count, created_at
      FROM email_campaigns
      WHERE id = $1
    `,
    [campaignId],
  );
  return row ? toCampaignSummary(row) : null;
}

export async function claimNextDelivery(
  workerId: string,
): Promise<ClaimedEmailDelivery | null> {
  await recoverExhaustedLeases();
  const row = await queryOne<DeliveryRow>(
    `
      WITH candidate AS (
        SELECT d.id
        FROM email_deliveries d
        JOIN email_campaigns c ON c.id = d.campaign_id
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
        UPDATE email_deliveries d
        SET state = 'sending', claimed_at = now(), claimed_by = $1,
            attempt_count = d.attempt_count + 1
        FROM candidate
        WHERE d.id = candidate.id
        RETURNING d.id, d.campaign_id, d.recipient_email, d.recipient_name,
                  d.attempt_count
      )
      SELECT claimed.id, claimed.campaign_id, claimed.recipient_email,
             claimed.recipient_name, c.subject, c.text_body, c.html_body,
             claimed.attempt_count
      FROM claimed
      JOIN email_campaigns c ON c.id = claimed.campaign_id
    `,
    [workerId],
  );
  if (!row) return null;
  await query(
    `
      UPDATE email_campaigns
      SET status = 'sending', started_at = COALESCE(started_at, now())
      WHERE id = $1 AND status = 'queued'
    `,
    [row.campaign_id],
  );
  return toDelivery(row);
}

async function recoverExhaustedLeases(): Promise<void> {
  const recovered = await query<{ campaign_id: string }>(
    `
      UPDATE email_deliveries
      SET state = 'failed',
          last_error = 'Worker lease expired after the retry limit'
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

async function refreshCampaignState(campaignId: string): Promise<void> {
  await query(
    `
      UPDATE email_campaigns c
      SET sent_count = counts.sent_count,
          failed_count = counts.failed_count,
          status = CASE
            WHEN counts.pending_count > 0 OR counts.sending_count > 0 THEN 'sending'
            WHEN counts.failed_count > 0 THEN 'failed'
            ELSE 'completed'
          END,
          completed_at = CASE
            WHEN counts.pending_count = 0 AND counts.sending_count = 0 THEN COALESCE(c.completed_at, now())
            ELSE c.completed_at
          END
      FROM (
        SELECT
          count(*) FILTER (WHERE state = 'sent')::integer AS sent_count,
          count(*) FILTER (WHERE state = 'failed')::integer AS failed_count,
          count(*) FILTER (WHERE state = 'pending')::integer AS pending_count,
          count(*) FILTER (WHERE state = 'sending')::integer AS sending_count
        FROM email_deliveries
        WHERE campaign_id = $1
      ) counts
      WHERE c.id = $1
    `,
    [campaignId],
  );
}

export async function markDeliverySent(
  deliveryId: string,
  campaignId: string,
  messageId: string | undefined,
): Promise<void> {
  await query(
    `
      UPDATE email_deliveries
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
      UPDATE email_deliveries
      SET state = $2,
          next_attempt_at = CASE WHEN $2 = 'pending' THEN now() + ($3 * interval '1 second') ELSE next_attempt_at END,
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
