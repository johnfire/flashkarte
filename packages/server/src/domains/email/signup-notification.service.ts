import type { PoolClient } from "pg";
import { getSignupNotificationEmail } from "../../config/env";
import { recordRequired, userActor } from "../audit/audit.service";
import { renderMessageHtml } from "./email.service";
import { insertSignupNotification } from "./signup-notification.repository";

export interface SignupNotificationUser {
  id: string;
  email: string;
  created_at: Date;
}

export function renderSignupNotification(user: SignupNotificationUser) {
  const textBody = [
    "A new user has signed up for LearnWohl.",
    `Email: ${user.email}`,
    `Account ID: ${user.id}`,
    `Signed up (UTC): ${user.created_at.toISOString()}`,
    "Email verification: pending at signup.",
  ].join("\n\n");
  return {
    subject: "LearnWohl — new user signup",
    textBody,
    htmlBody: renderMessageHtml(
      textBody,
      "You received this administrator notification because signup alerts are enabled.",
    ),
  };
}

/** Persist the event with the account; SMTP runs only in the email worker. */
export async function queueSignupNotification(
  client: PoolClient,
  user: SignupNotificationUser,
): Promise<void> {
  const recipientEmail = getSignupNotificationEmail();
  if (!recipientEmail) return;
  const campaignId = await insertSignupNotification(client, {
    userId: user.id,
    recipientEmail,
    ...renderSignupNotification(user),
  });
  if (!campaignId) return;
  await recordRequired(
    {
      actor: userActor(user.id),
      action: "email.signup_notification_queued",
      targetType: "email_campaign",
      targetId: campaignId,
      afterState: { signupUserId: user.id },
    },
    client,
  );
}
