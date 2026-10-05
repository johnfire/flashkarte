import type { PoolClient } from "pg";
import { query, queryOne } from "../../db/client";
import { ValidationError } from "../../utils/errors";
import type { PromoInput, SignupPlan } from "./promo.validation";

export interface PromoRow {
  id: string;
  code: string;
  kind: "discount" | "free_access";
  percent_off: number | null;
  discount_duration: "once" | "forever" | null;
  free_days: number | null;
  stripe_coupon_id: string | null;
  eligible_plan: "any" | "monthly" | "yearly";
  expires_at: Date | null;
  max_activations: number | null;
  activation_count: number;
  active: boolean;
}

export function listPromos() {
  return query<PromoRow>(
    "SELECT * FROM signup_promos ORDER BY created_at DESC",
  );
}

export async function codeExists(code: string): Promise<boolean> {
  return (
    (await queryOne<{ id: string }>(
      "SELECT id FROM signup_promos WHERE code = $1",
      [code],
    )) !== null
  );
}

export function findAvailablePromo(code: string) {
  return queryOne<PromoRow>(
    `SELECT * FROM signup_promos WHERE code = $1 AND active
     AND (expires_at IS NULL OR expires_at > now())
     AND (max_activations IS NULL OR activation_count < max_activations)`,
    [code],
  );
}

export async function insertPromo(
  client: PoolClient,
  id: string,
  promo: PromoInput,
  couponId: string | null,
) {
  const created = await client.query<PromoRow>(
    `INSERT INTO signup_promos (id, code, kind, percent_off, discount_duration,
       free_days, stripe_coupon_id, eligible_plan, expires_at, max_activations)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [
      id,
      promo.code,
      promo.kind,
      promo.kind === "discount" ? promo.percentOff : null,
      promo.kind === "discount" ? promo.discountDuration : null,
      promo.kind === "free_access" ? promo.freeDays : null,
      couponId,
      promo.kind === "discount" ? promo.eligiblePlan : "any",
      promo.expiresAt,
      promo.maxActivations,
    ],
  );
  return created.rows[0];
}

export async function setPromoActive(
  client: PoolClient,
  id: string,
  active: boolean,
) {
  const updated = await client.query<PromoRow>(
    "UPDATE signup_promos SET active = $2 WHERE id = $1 RETURNING *",
    [id, active],
  );
  if (!updated.rows[0]) throw new ValidationError("Promo not found");
  return updated.rows[0];
}

export async function claimPromo(
  client: PoolClient,
  code: string,
): Promise<PromoRow> {
  const claimed = await client.query<PromoRow>(
    `UPDATE signup_promos SET activation_count = activation_count + 1
     WHERE code = $1 AND active AND (expires_at IS NULL OR expires_at > now())
       AND (max_activations IS NULL OR activation_count < max_activations)
     RETURNING *`,
    [code],
  );
  if (!claimed.rows[0])
    throw new ValidationError(
      "Promo code is invalid, expired, paused, or fully used",
    );
  return claimed.rows[0];
}

export async function insertActivation(
  client: PoolClient,
  userId: string,
  promo: PromoRow,
  plan: SignupPlan,
) {
  await client.query(
    `INSERT INTO signup_promo_activations (user_id, promo_id, signup_plan, access_expires_at)
     VALUES ($1, $2, $3, CASE WHEN $4::integer IS NULL THEN NULL
       ELSE now() + $4 * interval '1 day' END)`,
    [userId, promo.id, plan, promo.free_days],
  );
}

export async function findSignupDiscount(
  userId: string,
  plan: string,
): Promise<string | undefined> {
  const promo = await queryOne<{ stripe_coupon_id: string }>(
    `SELECT p.stripe_coupon_id FROM signup_promo_activations a
     JOIN signup_promos p ON p.id = a.promo_id
     WHERE a.user_id = $1 AND a.signup_plan = $2 AND p.kind = 'discount'
       AND NOT EXISTS (SELECT 1 FROM billing_subscriptions s WHERE s.user_id = $1)`,
    [userId, plan],
  );
  return promo?.stripe_coupon_id;
}

export async function findSignupDiscountBenefit(userId: string) {
  return queryOne<{
    code: string;
    percentOff: number;
    discountDuration: "once" | "forever";
    plan: "monthly" | "yearly";
  }>(
    `SELECT p.code, p.percent_off AS "percentOff", p.discount_duration AS "discountDuration", a.signup_plan AS plan
     FROM signup_promo_activations a JOIN signup_promos p ON p.id = a.promo_id
     WHERE a.user_id = $1 AND p.kind = 'discount'
       AND NOT EXISTS (SELECT 1 FROM billing_subscriptions s WHERE s.user_id = $1)`,
    [userId],
  );
}

export async function lockSignupDiscount(
  client: PoolClient,
  userId: string,
  plan: string,
) {
  const activation = await client.query<{
    stripe_coupon_id: string;
    stripe_checkout_id: string | null;
  }>(
    `SELECT p.stripe_coupon_id, a.stripe_checkout_id FROM signup_promo_activations a
     JOIN signup_promos p ON p.id = a.promo_id
     WHERE a.user_id = $1 AND a.signup_plan = $2 AND p.kind = 'discount'
       AND NOT EXISTS (SELECT 1 FROM billing_subscriptions s WHERE s.user_id = $1)
     FOR UPDATE OF a`,
    [userId, plan],
  );
  return activation.rows[0] ?? null;
}

export async function storeCheckout(
  client: PoolClient,
  userId: string,
  checkoutId: string,
) {
  await client.query(
    "UPDATE signup_promo_activations SET stripe_checkout_id = $2 WHERE user_id = $1",
    [userId, checkoutId],
  );
}
