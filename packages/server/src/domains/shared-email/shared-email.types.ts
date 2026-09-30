export type SharedEmailCategory =
  "transactional" | "service_announcement" | "product_update";

export type SharedEmailCampaignStatus =
  "queued" | "sending" | "completed" | "failed" | "cancelled";

export interface SharedEmailTenant {
  slug: string;
  fromAddress: string;
  replyTo: string | null;
}

export interface SharedEmailRecipientInput {
  externalUserId: string;
  email: string;
  displayName?: string | null;
  emailVerified?: boolean;
  serviceAnnouncementsOptIn?: boolean;
  productUpdatesOptIn?: boolean;
}

export interface SharedEmailCampaignSummary {
  id: string;
  status: SharedEmailCampaignStatus;
  category: SharedEmailCategory;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export interface SharedEmailCampaignRequest {
  category: SharedEmailCategory;
  subject: string;
  textBody: string;
  htmlBody?: string;
  recipientExternalIds: string[];
}

export interface ClaimedSharedEmailDelivery {
  id: string;
  campaignId: string;
  tenantSlug: string;
  fromAddress: string;
  replyTo: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  textBody: string;
  htmlBody: string;
  attemptCount: number;
}
