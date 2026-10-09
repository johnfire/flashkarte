import { ForbiddenError, ValidationError } from "../../utils/errors";
import type { Queryable } from "../../db/queryable";
import { z } from "zod";
import { parse } from "../../utils/validate";
import * as repository from "./billing.repository";
import * as googlePlay from "./google-play.provider";
import * as stripe from "./stripe.provider";
import { createSignupDiscountCheckout } from "../promos/promo-checkout.service";

export const FREE_ACTIVE_UNIT_LIMIT = 10;
const unitTypeSchema = z.enum([
  "deck",
  "course",
  "subject",
  "course_collection",
]);
const unitIdSchema = z.string().uuid("Billing unit id must be a UUID");

function hasUnlimitedAccess(
  accountType: string,
  subscription: repository.SubscriptionRow | null,
  schoolMember = false,
): boolean {
  if (["paid", "admin-gifted", "admin"].includes(accountType)) return true;
  if (schoolMember) return true;
  return subscription !== null;
}

export async function getStatus(userId: string) {
  const status = await repository.getBillingStatus(userId);
  const unlimited =
    hasUnlimitedAccess(
      status.account_type,
      status.active_subscription,
      status.school_member,
    ) || Boolean(status.promo_access_ends_at);
  return {
    plan: unlimited ? "paid" : "free",
    accountType: status.account_type,
    promoAccessEndsAt: status.promo_access_ends_at ?? null,
    signupDiscount: status.signup_discount ?? null,
    activeUnitCount: status.active_unit_count,
    activeUnitLimit: unlimited ? null : FREE_ACTIVE_UNIT_LIMIT,
    overLimit: !unlimited && status.active_unit_count > FREE_ACTIVE_UNIT_LIMIT,
    subscription: status.active_subscription
      ? {
          provider: status.active_subscription.provider,
          plan: status.active_subscription.plan,
          status: status.active_subscription.status,
          currentPeriodEnd: status.active_subscription.current_period_end,
          cancelAtPeriodEnd: status.active_subscription.cancel_at_period_end,
        }
      : null,
  };
}

/**
 * Creation is denied only when it would add a new unit. Existing content is
 * intentionally preserved after a downgrade; the caller can later add an
 * activation/archive workflow without deleting anything.
 */
export async function assertCanCreateUnit(userId: string): Promise<void> {
  const status = await getStatus(userId);
  if (
    status.plan === "free" &&
    status.activeUnitCount >= FREE_ACTIVE_UNIT_LIMIT
  ) {
    throw new ForbiddenError(
      "Free accounts can have up to 10 active decks or courses. Upgrade or deactivate existing content to add another.",
      {
        code: "PLAN_LIMIT_REACHED",
        activeUnitCount: status.activeUnitCount,
        activeUnitLimit: FREE_ACTIVE_UNIT_LIMIT,
      },
    );
  }
}

export function withUnitCreation<T>(
  userId: string,
  work: (db: Queryable) => Promise<T>,
): Promise<T> {
  return repository.withBillingTransaction(userId, async (db) => {
    await repository.assertCanCreateUnitInTransaction(db, userId);
    return work(db);
  });
}

export const withBillingTransaction = repository.withBillingTransaction;

export function listUnits(userId: string) {
  return repository.listUnits(userId);
}

export function setUnitActive(
  userId: string,
  unitTypeInput: unknown,
  unitIdInput: unknown,
  activeInput: unknown,
) {
  const unitType = parse(unitTypeSchema, unitTypeInput);
  const unitId = parse(unitIdSchema, unitIdInput);
  const active = parse(z.boolean(), activeInput);
  return repository.setUnitActive(userId, unitType, unitId, active);
}

export async function createStripeCheckout(
  userId: string,
  planInput: unknown,
): Promise<string> {
  const plan =
    planInput === "yearly"
      ? "yearly"
      : planInput === "monthly"
        ? "monthly"
        : null;
  if (!plan)
    throw new ValidationError("Billing plan must be monthly or yearly");
  const email = await repository.getUserEmail(userId);
  const promoCheckout = await createSignupDiscountCheckout(userId, email, plan);
  return promoCheckout ?? stripe.createCheckoutSession(userId, email, plan);
}

export function createStripePortal(userId: string): Promise<string> {
  return stripe.createCustomerPortalSession(userId);
}

export function verifyGooglePlayPurchase(
  userId: string,
  purchaseTokenInput: unknown,
): Promise<void> {
  if (typeof purchaseTokenInput !== "string" || !purchaseTokenInput.trim()) {
    throw new ValidationError("Google Play purchase token is required");
  }
  return googlePlay.verifyPurchase(userId, purchaseTokenInput.trim());
}

export function handleStripeWebhook(
  raw: Buffer,
  signature: string,
): Promise<void> {
  return stripe.handleWebhook(raw, signature);
}

export async function handleGooglePlayRtdn(
  authorization: string | undefined,
  body: unknown,
): Promise<void> {
  const expected = process.env.GOOGLE_PLAY_RTDN_TOKEN;
  if (!expected || authorization !== `Bearer ${expected}`) {
    throw new Error("Invalid Google Play RTDN authorization");
  }
  if (!body || typeof body !== "object") throw new Error("Invalid RTDN body");
  const message = (body as { message?: { messageId?: string; data?: string } })
    .message;
  if (!message?.messageId || !message.data) {
    throw new Error("Google Play RTDN message is incomplete");
  }
  if (!(await repository.claimEvent("google_play", message.messageId))) return;
  try {
    const decoded = JSON.parse(
      Buffer.from(message.data, "base64").toString("utf8"),
    ) as { subscriptionNotification?: { purchaseToken?: string } };
    const purchaseToken = decoded.subscriptionNotification?.purchaseToken;
    if (purchaseToken) await googlePlay.handleRtdn(purchaseToken);
    await repository.markEventProcessed("google_play", message.messageId);
  } catch (error) {
    await repository.markEventProcessed(
      "google_play",
      message.messageId,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}
