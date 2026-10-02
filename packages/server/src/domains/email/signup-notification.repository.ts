import type { PoolClient } from "pg";
import { getCorrelationId } from "../../utils/logger";

export async function insertSignupNotification(
  client: PoolClient,
  notification: {
    userId: string;
    recipientEmail: string;
    subject: string;
    textBody: string;
    htmlBody: string;
  },
): Promise<string | null> {
  const campaigns = await client.query<{ id: string }>(
    `INSERT INTO email_campaigns
      (category, event_key, created_by, subject, text_body, html_body, recipient_count, correlation_id)
     VALUES ('signup_notification', $1, $2, $3, $4, $5, 1, $6)
     ON CONFLICT (event_key) DO NOTHING RETURNING id`,
    [
      `signup:${notification.userId}`,
      notification.userId,
      notification.subject,
      notification.textBody,
      notification.htmlBody,
      getCorrelationId() ?? null,
    ],
  );
  const campaignId = campaigns.rows[0]?.id;
  if (!campaignId) return null;
  // The destination is the administrator, not the newly created account.
  await client.query(
    `INSERT INTO email_deliveries (campaign_id, recipient_email)
     VALUES ($1, $2)`,
    [campaignId, notification.recipientEmail],
  );
  return campaignId;
}
