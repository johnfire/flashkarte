import { withTransaction } from "../../db/client";
import { record } from "../audit/audit.service";
import { ValidationError } from "../../utils/errors";
import * as repository from "./shared-email.repository";
import type {
  SharedEmailCampaignRequest,
  SharedEmailCampaignSummary,
  SharedEmailRecipientInput,
  SharedEmailTenant,
} from "./shared-email.types";

const MAX_RECIPIENTS_PER_REQUEST = 1_000;
const MAX_EXTERNAL_ID_LENGTH = 255;

function validateText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string")
    throw new ValidationError(`${field} is required`);
  const trimmed = value.trim();
  if (trimmed.length < 1 || trimmed.length > maxLength) {
    throw new ValidationError(
      `${field} must be between 1 and ${maxLength} characters`,
    );
  }
  return trimmed;
}

function validateEmail(value: unknown): string {
  const email = validateText(value, "Email", 320).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError("Email must be valid");
  }
  return email;
}

function validateExternalUserId(value: unknown): string {
  const externalUserId = validateText(
    value,
    "External user ID",
    MAX_EXTERNAL_ID_LENGTH,
  );
  if (externalUserId.includes("\n")) {
    throw new ValidationError("External user ID must be a single line");
  }
  return externalUserId;
}

function validateCategory(
  value: unknown,
): SharedEmailCampaignRequest["category"] {
  if (
    value !== "transactional" &&
    value !== "service_announcement" &&
    value !== "product_update"
  ) {
    throw new ValidationError("Category is invalid");
  }
  return value;
}

function normalizeRecipientInput(value: unknown): SharedEmailRecipientInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("Recipient must be an object");
  }
  const input = value as Record<string, unknown>;
  return {
    externalUserId: validateExternalUserId(input.externalUserId),
    email: validateEmail(input.email),
    displayName:
      input.displayName == null
        ? null
        : validateText(input.displayName, "Display name", 200),
    emailVerified: input.emailVerified === true,
    serviceAnnouncementsOptIn: input.serviceAnnouncementsOptIn !== false,
    productUpdatesOptIn: input.productUpdatesOptIn === true,
  };
}

function normalizeExternalUserIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new ValidationError("At least one recipient is required");
  }
  const externalUserIds = [
    ...new Set(value.map((entry) => validateExternalUserId(entry))),
  ];
  if (externalUserIds.length > MAX_RECIPIENTS_PER_REQUEST) {
    throw new ValidationError(
      `A request may target at most ${MAX_RECIPIENTS_PER_REQUEST} recipients`,
    );
  }
  return externalUserIds;
}

function renderPlainTextHtml(textBody: string): string {
  const escaped = textBody.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#111"><p>${escaped.replace(/\n/g, "<br>")}</p></div>`;
}

async function auditSharedEmailAction(
  tenant: SharedEmailTenant,
  action: string,
  targetId?: string,
): Promise<void> {
  await record({
    actor: { type: "ai-agent", id: `email-service:${tenant.slug}` },
    action,
    targetType: targetId ? "email_service_campaign" : "email_service_recipient",
    targetId,
  });
}

export async function upsertRecipients(
  tenant: SharedEmailTenant,
  input: unknown,
): Promise<{ count: number }> {
  if (!Array.isArray(input) || input.length < 1) {
    throw new ValidationError("Recipients must be a non-empty array");
  }
  if (input.length > MAX_RECIPIENTS_PER_REQUEST) {
    throw new ValidationError(
      `A request may contain at most ${MAX_RECIPIENTS_PER_REQUEST} recipients`,
    );
  }
  const recipients = input.map(normalizeRecipientInput);
  await withTransaction(async (client) => {
    await repository.ensureTenant(client, tenant);
    for (const recipient of recipients) {
      await repository.upsertRecipient(client, tenant.slug, recipient);
    }
  });
  await auditSharedEmailAction(tenant, "email_service.recipients_upserted");
  return { count: recipients.length };
}

export async function deactivateRecipient(
  tenant: SharedEmailTenant,
  input: unknown,
): Promise<void> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("Recipient must be an object");
  }
  const externalUserId = validateExternalUserId(
    (input as Record<string, unknown>).externalUserId,
  );
  await repository.deactivateRecipient(tenant.slug, externalUserId);
  await auditSharedEmailAction(tenant, "email_service.recipient_deactivated");
}

export async function createCampaign(
  tenant: SharedEmailTenant,
  input: unknown,
): Promise<SharedEmailCampaignSummary> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("Campaign must be an object");
  }
  const body = input as Record<string, unknown>;
  const request: SharedEmailCampaignRequest = {
    category: validateCategory(body.category),
    subject: validateText(body.subject, "Subject", 200),
    textBody: validateText(body.textBody, "Message", 20_000),
    htmlBody:
      body.htmlBody == null
        ? undefined
        : validateText(body.htmlBody, "HTML message", 40_000),
    recipientExternalIds: normalizeExternalUserIds(body.recipientExternalIds),
  };
  const campaign = await withTransaction(async (client) => {
    await repository.ensureTenant(client, tenant);
    const recipients = await repository.findEligibleRecipients(
      client,
      tenant.slug,
      request.category,
      request.recipientExternalIds,
    );
    if (recipients.length !== request.recipientExternalIds.length) {
      throw new ValidationError(
        "Every recipient must be active and eligible for this message category",
      );
    }
    return repository.createCampaign(client, {
      tenant,
      category: request.category,
      createdBy: `tenant:${tenant.slug}`,
      subject: request.subject,
      textBody: request.textBody,
      htmlBody: request.htmlBody ?? renderPlainTextHtml(request.textBody),
      recipients,
    });
  });
  await auditSharedEmailAction(
    tenant,
    "email_service.campaign_created",
    campaign.id,
  );
  return campaign;
}

export async function sendTransactional(
  tenant: SharedEmailTenant,
  input: unknown,
): Promise<SharedEmailCampaignSummary> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ValidationError("Message must be an object");
  }
  const body = input as Record<string, unknown>;
  const recipientExternalId = validateExternalUserId(body.externalUserId);
  return createCampaign(tenant, {
    category: "transactional",
    subject: body.subject,
    textBody: body.textBody,
    htmlBody: body.htmlBody,
    recipientExternalIds: [recipientExternalId],
  });
}

export async function getCampaign(
  tenant: SharedEmailTenant,
  campaignId: string,
): Promise<SharedEmailCampaignSummary> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      campaignId,
    )
  ) {
    throw new ValidationError("Campaign ID is invalid");
  }
  const campaign = await repository.getCampaign(tenant.slug, campaignId);
  if (!campaign) throw new ValidationError("Campaign not found");
  return campaign;
}

export async function processNextDelivery(workerId: string): Promise<boolean> {
  const delivery = await repository.claimNextDelivery(workerId);
  if (!delivery) return false;
  const messageId = `<${delivery.id}@shared-email.local>`;
  try {
    const { sendMail } = await import("../../email/mailer");
    const result = await sendMail({
      to: delivery.recipientEmail,
      subject: delivery.subject,
      text: delivery.textBody,
      html: delivery.htmlBody,
      from: delivery.fromAddress,
      replyTo: delivery.replyTo ?? undefined,
      messageId,
    });
    if (!result.accepted) {
      throw new Error(result.reason ?? "SMTP did not accept the message");
    }
    await repository.markDeliverySent(
      delivery.id,
      delivery.campaignId,
      result.messageId ?? messageId,
    );
  } catch (error) {
    await repository.markDeliveryFailed(
      delivery.id,
      delivery.campaignId,
      delivery.attemptCount,
      error instanceof Error ? error.message : String(error),
    );
  }
  return true;
}
