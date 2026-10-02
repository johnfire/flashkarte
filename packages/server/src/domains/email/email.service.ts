import crypto from "crypto";
import { withTransaction } from "../../db/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { logger } from "../../utils/logger";
import * as repository from "./email.repository";
import type { ClaimedEmailDelivery, EmailCampaignSummary } from "./email.types";

const MAX_RECIPIENTS_PER_CAMPAIGN = 1_000;
function validateSubject(value: unknown): string {
  if (typeof value !== "string")
    throw new ValidationError("Subject is required");
  const subject = value.trim();
  if (subject.length < 1 || subject.length > 200) {
    throw new ValidationError("Subject must be between 1 and 200 characters");
  }
  return subject;
}

function validateMessageBody(value: unknown): string {
  if (typeof value !== "string")
    throw new ValidationError("Message is required");
  const body = value.trim();
  if (body.length < 1 || body.length > 20_000) {
    throw new ValidationError(
      "Message must be between 1 and 20,000 characters",
    );
  }
  return body;
}

function parseRecipientIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1) {
    throw new ValidationError("Select at least one verified user");
  }
  const ids = [...new Set(value.map((entry) => parseUuid(entry)))];
  if (ids.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
    throw new ValidationError(
      `A single message may target at most ${MAX_RECIPIENTS_PER_CAMPAIGN} users`,
    );
  }
  return ids;
}

function parseUuid(value: unknown): string {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new ValidationError("Recipient IDs must be valid user IDs");
  }
  return value;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}

export function renderMessageHtml(
  textBody: string,
  footer = "You received this service message because you have a flashkarte account.",
): string {
  const paragraphs = textBody
    .split(/\n{2,}/)
    .map(
      (paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  return `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#111">${paragraphs}<p style="color:#666;font-size:13px">${escapeHtml(footer)}</p></div>`;
}

export async function contactUsers(
  createdBy: string,
  subjectInput: unknown,
  textBodyInput: unknown,
  recipientIdsInput: unknown,
): Promise<EmailCampaignSummary> {
  const subject = validateSubject(subjectInput);
  const textBody = validateMessageBody(textBodyInput);
  const recipientIds = parseRecipientIds(recipientIdsInput);
  return withTransaction(async (client) => {
    const recipients = await repository.findEligibleRecipients(
      recipientIds,
      client,
    );
    if (recipients.length !== recipientIds.length) {
      throw new ValidationError(
        "Every selected recipient must be an existing, verified user",
      );
    }
    const campaign = await repository.createCampaign(client, {
      createdBy,
      subject,
      textBody,
      htmlBody: renderMessageHtml(textBody),
      recipientCount: recipients.length,
    });
    await repository.createDeliveries(client, campaign.id, recipients);
    return campaign;
  });
}

export async function getCampaignStatus(
  campaignId: string,
): Promise<EmailCampaignSummary> {
  const campaign = await repository.getCampaign(campaignId);
  if (!campaign) throw new NotFoundError("Email campaign not found");
  return campaign;
}

export async function processNextDelivery(workerId: string): Promise<boolean> {
  const delivery = await repository.claimNextDelivery(workerId);
  if (!delivery) return false;
  await logger.withCorrelationId(delivery.correlationId ?? delivery.id, () =>
    sendClaimedDelivery(delivery),
  );
  return true;
}

async function sendClaimedDelivery(
  delivery: ClaimedEmailDelivery,
): Promise<void> {
  const messageId = `<${delivery.id}@flashkarte.local>`;
  try {
    const { sendMail } = await import("../../email/mailer");
    const result = await sendMail({
      to: delivery.recipientEmail,
      subject: delivery.subject,
      text: delivery.textBody,
      html: delivery.htmlBody,
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
    const message = error instanceof Error ? error.message : String(error);
    await repository.markDeliveryFailed(
      delivery.id,
      delivery.campaignId,
      delivery.attemptCount,
      message,
    );
  }
}

export async function runEmailWorker(): Promise<void> {
  const workerId = `${process.pid}-${crypto.randomUUID()}`;
  for (;;) {
    try {
      const processed =
        (await processNextDelivery(workerId)) ||
        (await processNextSharedDelivery(workerId));
      if (!processed) await waitForWorkerPoll();
    } catch (error) {
      logger.error("email.worker", "delivery loop failed; retrying", {
        workerId,
        error: error instanceof Error ? error.message : String(error),
      });
      await waitForWorkerPoll();
    }
  }
}

async function processNextSharedDelivery(workerId: string): Promise<boolean> {
  const { processNextDelivery: processSharedDelivery } =
    await import("../shared-email/shared-email.service");
  return processSharedDelivery(workerId);
}

function waitForWorkerPoll(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1_000));
}
