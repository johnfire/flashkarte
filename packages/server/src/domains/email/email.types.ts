export type EmailCampaignStatus =
  "queued" | "sending" | "completed" | "failed" | "cancelled";

export interface EmailCampaignSummary {
  id: string;
  status: EmailCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export interface EligibleRecipient {
  id: string;
  email: string;
  displayName: string | null;
}

export interface ClaimedEmailDelivery {
  id: string;
  campaignId: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  textBody: string;
  htmlBody: string;
  attemptCount: number;
}
