import crypto from "crypto";
import { BillingConfigurationError } from "../../utils/errors";
import type {
  BillingPlan,
  BillingStatus,
  SubscriptionInput,
} from "./billing.repository";
import * as repository from "./billing.repository";
import type { PromoInput } from "../promos/promo.validation";

interface StripeSubscription {
  id: string;
  customer?: string;
  status: string;
  metadata?: Record<string, string>;
  cancel_at_period_end?: boolean;
  current_period_start?: number;
  current_period_end?: number;
  items?: { data?: Array<{ price?: { id?: string } }> };
}

function secret(): string {
  const value = process.env.STRIPE_SECRET_KEY;
  if (!value)
    throw new BillingConfigurationError("STRIPE_SECRET_KEY is missing");
  return value;
}

function priceId(plan: BillingPlan): string {
  const value =
    plan === "monthly"
      ? process.env.STRIPE_PRICE_MONTHLY
      : process.env.STRIPE_PRICE_YEARLY;
  if (!value) {
    throw new BillingConfigurationError(
      `Stripe price for ${plan} is not configured`,
    );
  }
  return value;
}

function status(value: string): BillingStatus {
  if (value === "active" || value === "trialing" || value === "past_due") {
    return value;
  }
  if (value === "canceled") return "canceled";
  return "expired";
}

function planForPrice(price: string | undefined): BillingPlan {
  if (price && price === process.env.STRIPE_PRICE_YEARLY) return "yearly";
  return "monthly";
}

function iso(unixSeconds: number | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

async function stripeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secret()}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(
      `Stripe request failed: ${body.error?.message ?? response.status}`,
    );
  }
  return body;
}

export async function createPromoCoupon(
  promoId: string,
  promo: Extract<PromoInput, { kind: "discount" }>,
): Promise<string> {
  const coupon = await stripeRequest<{ id: string }>("coupons", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `promo-${promoId}`,
    },
    body: new URLSearchParams({
      id: `fk-${promoId}`,
      name: promo.code,
      percent_off: String(promo.percentOff),
      duration: promo.discountDuration,
    }),
  });
  return coupon.id;
}

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: BillingPlan,
): Promise<string> {
  return (await requestCheckoutSession(userId, email, plan)).url;
}

interface CheckoutSession {
  id: string;
  url: string;
  status?: string;
}

export function createDiscountCheckoutSession(
  userId: string,
  email: string,
  plan: BillingPlan,
  couponId: string,
  idempotencyKey: string,
) {
  return requestCheckoutSession(userId, email, plan, couponId, idempotencyKey);
}

export function retrieveCheckoutSession(checkoutId: string) {
  return stripeRequest<{ id: string; url: string | null; status: string }>(
    `checkout/sessions/${encodeURIComponent(checkoutId)}`,
  );
}

function checkoutParameters(
  userId: string,
  email: string,
  plan: BillingPlan,
): URLSearchParams {
  const successUrl = process.env.STRIPE_SUCCESS_URL;
  const cancelUrl = process.env.STRIPE_CANCEL_URL;
  if (!successUrl || !cancelUrl) {
    throw new BillingConfigurationError(
      "STRIPE_SUCCESS_URL and STRIPE_CANCEL_URL are required",
    );
  }
  return new URLSearchParams({
    mode: "subscription",
    customer_email: email,
    "line_items[0][price]": priceId(plan),
    "line_items[0][quantity]": "1",
    success_url: successUrl,
    cancel_url: cancelUrl,
    "metadata[userId]": userId,
    "metadata[plan]": plan,
    "subscription_data[metadata][userId]": userId,
    "subscription_data[metadata][plan]": plan,
  });
}

async function requestCheckoutSession(
  userId: string,
  email: string,
  plan: BillingPlan,
  couponId?: string,
  idempotencyKey?: string,
): Promise<CheckoutSession> {
  const params = checkoutParameters(userId, email, plan);
  if (couponId) params.set("discounts[0][coupon]", couponId);
  const session = await stripeRequest<CheckoutSession>("checkout/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: params,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  if (couponId && !session.id)
    throw new Error("Stripe did not return a checkout ID");
  return session;
}

export async function createCustomerPortalSession(
  userId: string,
): Promise<string> {
  const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL;
  if (!returnUrl) {
    throw new BillingConfigurationError("STRIPE_PORTAL_RETURN_URL is required");
  }
  const subscription = await repository.findLatestSubscriptionForUser(
    userId,
    "stripe",
  );
  if (!subscription) throw new Error("No Stripe subscription found");
  const stripeSubscription = await stripeRequest<StripeSubscription>(
    `subscriptions/${encodeURIComponent(subscription.provider_subscription_id)}`,
  );
  if (!stripeSubscription.customer) {
    throw new Error("Stripe subscription has no customer");
  }
  const session = await stripeRequest<{ url?: string }>(
    "billing_portal/sessions",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        customer: stripeSubscription.customer,
        return_url: returnUrl,
      }),
    },
  );
  if (!session.url) throw new Error("Stripe did not return a portal URL");
  return session.url;
}

function signatureMatches(raw: Buffer, signature: string): boolean {
  const values = new URLSearchParams(signature.replace(/,/g, "&"));
  const timestamp = values.get("t");
  const signatures = values.getAll("v1");
  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = crypto
    .createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET ?? "")
    .update(`${timestamp}.${raw.toString("utf8")}`)
    .digest("hex");
  return signatures.some((candidate) => {
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

export async function handleWebhook(
  raw: Buffer,
  signature: string,
): Promise<void> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !signatureMatches(raw, signature)) {
    throw new Error("Invalid Stripe webhook signature");
  }
  const event = JSON.parse(raw.toString("utf8")) as {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };
  if (!(await repository.claimEvent("stripe", event.id))) return;
  try {
    const object = event.data.object as unknown as StripeSubscription & {
      subscription?: string;
      metadata?: Record<string, string>;
    };
    if (
      event.type === "checkout.session.completed" &&
      typeof object.subscription === "string"
    ) {
      const subscription = await stripeRequest<StripeSubscription>(
        `subscriptions/${object.subscription}`,
      );
      await syncSubscription(subscription, object.metadata?.userId);
    } else if (event.type.startsWith("customer.subscription.")) {
      await syncSubscription(subscriptionObject(object));
    }
    await repository.markEventProcessed("stripe", event.id);
  } catch (error) {
    await repository.markEventProcessed(
      "stripe",
      event.id,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

function subscriptionObject(object: StripeSubscription): StripeSubscription {
  return object;
}

async function syncSubscription(
  subscription: StripeSubscription,
  userIdInput?: string,
): Promise<void> {
  const userId = userIdInput ?? subscription.metadata?.userId;
  if (!userId) {
    const existing = await repository.findSubscriptionByProviderId(
      "stripe",
      subscription.id,
    );
    if (!existing)
      throw new Error("Stripe subscription has no Flashkarte user");
    await storeSubscription(existing.user_id, subscription);
    return;
  }
  await storeSubscription(userId, subscription);
}

async function storeSubscription(
  userId: string,
  subscription: StripeSubscription,
): Promise<void> {
  const price = subscription.items?.data?.[0]?.price?.id;
  const input: SubscriptionInput = {
    userId,
    provider: "stripe",
    providerSubscriptionId: subscription.id,
    plan: planForPrice(price),
    status: status(subscription.status),
    currentPeriodStart: iso(subscription.current_period_start),
    currentPeriodEnd: iso(subscription.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    providerPayload: subscription,
  };
  await repository.upsertSubscription(input);
}
