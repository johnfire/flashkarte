import { withTransaction } from "../../db/client";
import { ValidationError } from "../../utils/errors";
import * as stripe from "../billing/stripe.provider";
import type { BillingPlan } from "../billing/billing.repository";
import * as repository from "./promo.repository";
import { recordRequired, userActor } from "../audit/audit.service";

async function findReusableCheckout(checkoutId: string | null) {
  if (!checkoutId) return null;
  const session = await stripe.retrieveCheckoutSession(checkoutId);
  if (session.status === "complete")
    throw new ValidationError("This signup discount has already been used");
  if (session.status === "open" && session.url) return session.url;
  if (session.status !== "expired")
    throw new Error("Unexpected Stripe checkout state");
  return null;
}

export async function createSignupDiscountCheckout(
  userId: string,
  email: string,
  plan: BillingPlan,
): Promise<string | null> {
  if (!(await repository.findSignupDiscount(userId, plan))) return null;
  return withTransaction(async (client) => {
    const activation = await repository.lockSignupDiscount(
      client,
      userId,
      plan,
    );
    if (!activation)
      throw new ValidationError("This signup discount has already been used");
    const pendingUrl = await findReusableCheckout(
      activation.stripe_checkout_id,
    );
    if (pendingUrl) return pendingUrl;
    const session = await stripe.createDiscountCheckoutSession(
      userId,
      email,
      plan,
      activation.stripe_coupon_id,
      `signup-promo-${userId}-${activation.stripe_checkout_id ?? "first"}`,
    );
    await repository.storeCheckout(client, userId, session.id);
    await recordRequired(
      {
        actor: userActor(userId),
        action: "billing.promo_checkout_created",
        targetType: "user",
        targetId: userId,
        afterState: { checkoutId: session.id, plan },
      },
      client,
    );
    return session.url;
  });
}
