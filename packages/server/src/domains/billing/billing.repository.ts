import { getPool, query, queryOne, withTransaction } from "../../db/client";
import type { Queryable } from "../../db/queryable";
import { ConflictError, ForbiddenError } from "../../utils/errors";
import { findPromoAccessEnd } from "../promos/promo-access.repository";
import { findSignupDiscountBenefit } from "../promos/promo.repository";

export type BillingProvider = "stripe" | "google_play";
export type BillingPlan = "monthly" | "yearly";
export type BillingStatus =
  | "pending"
  | "active"
  | "trialing"
  | "grace_period"
  | "past_due"
  | "canceled"
  | "on_hold"
  | "expired";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  provider: BillingProvider;
  provider_subscription_id: string;
  plan: BillingPlan;
  status: BillingStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export interface BillingStatusRow {
  signup_discount?: Awaited<ReturnType<typeof findSignupDiscountBenefit>>;
  promo_access_ends_at?: string | null;
  account_type: string;
  // Teachers, students and school logins belong to a school that pays for
  // all of them, so they are never on the free plan.
  school_member?: boolean;
  active_subscription: SubscriptionRow | null;
  active_unit_count: number;
}

export type BillingUnitType =
  "deck" | "course" | "subject" | "course_collection";

export interface BillingUnitRow {
  unit_type: BillingUnitType;
  unit_id: string;
  title: string;
  active: boolean;
}

export interface SubscriptionInput {
  userId: string;
  provider: BillingProvider;
  providerSubscriptionId: string;
  plan: BillingPlan;
  status: BillingStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  providerPayload: unknown;
}

const SUBSCRIPTION_COLS = `
  id, user_id, provider, provider_subscription_id, plan, status,
  current_period_start, current_period_end, cancel_at_period_end`;

/**
 * Decks someone else shared with the user that they added to their list.
 * They count toward a free account's units (app decks do not). Columns:
 * unit_type, unit_id, title. `$1` is the user id.
 */
const SHARED_DECK_UNITS = `
  SELECT 'deck'::text AS unit_type, d.id AS unit_id, d.title
  FROM deck_subscriptions sub
  JOIN decks d ON d.id = sub.deck_id
  WHERE sub.user_id = $1
    AND d.user_id <> $1
    AND NOT d.is_official
    AND deck_shared_with(d.id, $1::uuid)`;

/**
 * Unit definition for the free plan:
 * - a standalone owned deck counts once;
 * - an owned legacy course counts once, and its member decks do not count
 *   again;
 * - an owned or enrolled structured subject counts once unless it belongs to
 *   a course collection, in which case the collection counts once;
 * - a deck shared with the user (SHARED_DECK_UNITS) counts once.
 */
async function countActiveUnitsFrom(
  db: Queryable,
  userId: string,
): Promise<number> {
  const rows = await db.query<{ count: number }>(
    `SELECT count(DISTINCT (units.unit_type, units.unit_id))::int AS count
     FROM (
       SELECT 'deck'::text AS unit_type, d.id AS unit_id
       FROM decks d
       WHERE d.user_id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM course_decks cd
           JOIN courses c ON c.id = cd.course_id
           WHERE cd.deck_id = d.id AND c.user_id = $1
         )
       UNION ALL
       SELECT unit_type, unit_id FROM (${SHARED_DECK_UNITS}) shared
       UNION ALL
       SELECT 'course'::text, c.id
       FROM courses c
       WHERE c.user_id = $1
       UNION ALL
       SELECT DISTINCT
         CASE WHEN s.course_collection_id IS NULL
           THEN 'subject'::text ELSE 'course_collection'::text END,
         COALESCE(s.course_collection_id, s.id)
       FROM subjects s
       WHERE s.user_id = $1
          OR EXISTS (
            SELECT 1
            FROM subject_enrollments e
            WHERE e.subject_id = s.id AND e.user_id = $1
          )
     ) units
     LEFT JOIN billing_unit_states state
       ON state.user_id = $1
      AND state.unit_type = units.unit_type
      AND state.unit_id = units.unit_id
     WHERE COALESCE(state.active, true)`,
    [userId],
  );
  return rows.rows[0]?.count ?? 0;
}

export async function countActiveUnits(userId: string): Promise<number> {
  return countActiveUnitsFrom(getPool(), userId);
}

export async function getBillingStatus(
  userId: string,
): Promise<BillingStatusRow> {
  const user = await queryOne<{ account_type: string; school_member: boolean }>(
    "SELECT account_type, school_id IS NOT NULL AS school_member FROM users WHERE id = $1",
    [userId],
  );
  if (!user) throw new Error("User not found while reading billing status");
  const subscription = await queryOne<SubscriptionRow>(
    `SELECT ${SUBSCRIPTION_COLS}
     FROM billing_subscriptions
     WHERE user_id = $1
       AND (
         (status IN ('active', 'trialing', 'grace_period', 'past_due')
           AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )
     ORDER BY current_period_end DESC NULLS LAST, updated_at DESC
     LIMIT 1`,
    [userId],
  );
  return {
    account_type: user.account_type,
    school_member: user.school_member,
    active_subscription: subscription,
    active_unit_count: await countActiveUnits(userId),
    promo_access_ends_at: await findPromoAccessEnd(getPool(), userId),
    signup_discount: await findSignupDiscountBenefit(userId),
  };
}

/** Serialize free-plan mutations against one user so limit checks and inserts
 * happen in the same transaction. */
export function withBillingTransaction<T>(
  userId: string,
  work: (db: Queryable) => Promise<T>,
): Promise<T> {
  return withTransaction(async (client) => {
    const user = await client.query(
      "SELECT id FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    if (user.rowCount === 0) throw new Error("User not found while billing");
    return work(client);
  });
}

export async function assertCanCreateUnitInTransaction(
  db: Queryable,
  userId: string,
): Promise<void> {
  const user = await db.query<{ account_type: string; school_member: boolean }>(
    "SELECT account_type, school_id IS NOT NULL AS school_member FROM users WHERE id = $1",
    [userId],
  );
  const accountType = user.rows[0]?.account_type;
  if (!accountType) throw new Error("User not found while checking billing");
  if (["paid", "admin-gifted", "admin"].includes(accountType)) return;
  if (user.rows[0]?.school_member) return;
  if (await findPromoAccessEnd(db, userId)) return;

  const subscription = await db.query<{ id: string }>(
    `SELECT id FROM billing_subscriptions
     WHERE user_id = $1
       AND (
         (status IN ('active', 'trialing', 'grace_period', 'past_due')
           AND (current_period_end IS NULL OR current_period_end > now()))
         OR (status = 'canceled' AND current_period_end > now())
       )
     LIMIT 1`,
    [userId],
  );
  if (subscription.rows.length > 0) return;

  const activeUnitCount = await countActiveUnitsFrom(db, userId);
  if (activeUnitCount >= 10) {
    throw new ForbiddenError(
      "Free accounts can have up to 10 active decks or courses. Upgrade or deactivate existing content to add another.",
      {
        code: "PLAN_LIMIT_REACHED",
        activeUnitCount,
        activeUnitLimit: 10,
      },
    );
  }
}

export async function listUnits(userId: string): Promise<BillingUnitRow[]> {
  const rows = await query<BillingUnitRow>(
    `WITH units AS (
       SELECT 'deck'::text AS unit_type, d.id AS unit_id, d.title
       FROM decks d
       WHERE d.user_id = $1
         AND NOT EXISTS (
           SELECT 1 FROM course_decks cd
           JOIN courses c ON c.id = cd.course_id
           WHERE cd.deck_id = d.id AND c.user_id = $1
         )
       UNION ALL
       ${SHARED_DECK_UNITS}
       UNION ALL
       SELECT 'course'::text, c.id, c.title
       FROM courses c
       WHERE c.user_id = $1
       UNION ALL
       SELECT
         CASE WHEN s.course_collection_id IS NULL
           THEN 'subject'::text ELSE 'course_collection'::text END,
         COALESCE(s.course_collection_id, s.id),
         COALESCE(cc.title::text, s.title)
       FROM subjects s
       LEFT JOIN course_collections cc ON cc.id = s.course_collection_id
       WHERE s.user_id = $1
          OR EXISTS (
            SELECT 1 FROM subject_enrollments e
            WHERE e.subject_id = s.id AND e.user_id = $1
          )
       GROUP BY
         CASE WHEN s.course_collection_id IS NULL
           THEN 'subject'::text ELSE 'course_collection'::text END,
         COALESCE(s.course_collection_id, s.id),
         COALESCE(cc.title::text, s.title)
     )
     SELECT u.unit_type, u.unit_id, max(u.title) AS title,
            COALESCE(state.active, true) AS active
     FROM units u
     LEFT JOIN billing_unit_states state
       ON state.user_id = $1
      AND state.unit_type = u.unit_type
      AND state.unit_id = u.unit_id
     GROUP BY u.unit_type, u.unit_id, state.active
     ORDER BY lower(max(u.title)), u.unit_type, u.unit_id`,
    [userId],
  );
  return rows;
}

export async function setUnitActive(
  userId: string,
  unitType: BillingUnitType,
  unitId: string,
  active: boolean,
): Promise<BillingUnitRow> {
  return withBillingTransaction(userId, async (db) => {
    const unit = await db.query<BillingUnitRow>(
      `WITH units AS (
         SELECT 'deck'::text AS unit_type, d.id AS unit_id, d.title
         FROM decks d
         WHERE d.user_id = $1
           AND NOT EXISTS (
             SELECT 1 FROM course_decks cd
             JOIN courses c ON c.id = cd.course_id
             WHERE cd.deck_id = d.id AND c.user_id = $1
           )
         UNION ALL
         ${SHARED_DECK_UNITS}
         UNION ALL
         SELECT 'course'::text, c.id, c.title
         FROM courses c WHERE c.user_id = $1
         UNION ALL
         SELECT
           CASE WHEN s.course_collection_id IS NULL
             THEN 'subject'::text ELSE 'course_collection'::text END,
           COALESCE(s.course_collection_id, s.id),
           COALESCE(cc.title::text, s.title)
         FROM subjects s
         LEFT JOIN course_collections cc ON cc.id = s.course_collection_id
         WHERE (s.user_id = $1 OR EXISTS (
           SELECT 1 FROM subject_enrollments e
           WHERE e.subject_id = s.id AND e.user_id = $1
         ))
           AND (CASE WHEN s.course_collection_id IS NULL
             THEN 'subject'::text ELSE 'course_collection'::text END) = $2
           AND COALESCE(s.course_collection_id, s.id) = $3
         GROUP BY
           CASE WHEN s.course_collection_id IS NULL
             THEN 'subject'::text ELSE 'course_collection'::text END,
           COALESCE(s.course_collection_id, s.id),
           COALESCE(cc.title::text, s.title)
       )
       SELECT unit_type, unit_id, max(title) AS title, true AS active
       FROM units
       WHERE unit_type = $2 AND unit_id = $3
       GROUP BY unit_type, unit_id`,
      [userId, unitType, unitId],
    );
    const found = unit.rows[0];
    if (!found) throw new ConflictError("Billing unit not found");

    const currentState = await db.query<{ active: boolean }>(
      `SELECT active FROM billing_unit_states
       WHERE user_id = $1 AND unit_type = $2 AND unit_id = $3`,
      [userId, unitType, unitId],
    );
    if (active && currentState.rows[0]?.active === false) {
      await assertCanCreateUnitInTransaction(db, userId);
    }
    await db.query(
      `INSERT INTO billing_unit_states (user_id, unit_type, unit_id, active)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, unit_type, unit_id)
       DO UPDATE SET active = EXCLUDED.active, updated_at = now()`,
      [userId, unitType, unitId, active],
    );
    return { ...found, active };
  });
}

export async function getUserEmail(userId: string): Promise<string> {
  const row = await queryOne<{ email: string }>(
    "SELECT email FROM users WHERE id = $1",
    [userId],
  );
  if (!row) throw new Error("User not found while preparing billing");
  return row.email;
}

export async function claimEvent(
  provider: BillingProvider,
  providerEventId: string,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `INSERT INTO billing_events (provider, provider_event_id)
     VALUES ($1, $2)
     ON CONFLICT (provider, provider_event_id) DO UPDATE SET
       processing_started_at = now(),
       processing_error = NULL
     WHERE billing_events.processed_at IS NULL
       AND (
         billing_events.processing_error IS NOT NULL
         OR billing_events.processing_started_at < now() - interval '5 minutes'
       )
     RETURNING id`,
    [provider, providerEventId],
  );
  return rows.length > 0;
}

export async function markEventProcessed(
  provider: BillingProvider,
  providerEventId: string,
  error?: string,
): Promise<void> {
  await query(
    `UPDATE billing_events
     SET processed_at = CASE WHEN $3::text IS NULL THEN now() ELSE processed_at END,
         processing_error = $3,
         processing_started_at = CASE WHEN $3::text IS NULL THEN processing_started_at ELSE now() END
     WHERE provider = $1 AND provider_event_id = $2`,
    [provider, providerEventId, error ?? null],
  );
}

export async function findSubscriptionByProviderId(
  provider: BillingProvider,
  providerSubscriptionId: string,
): Promise<SubscriptionRow | null> {
  return queryOne<SubscriptionRow>(
    `SELECT ${SUBSCRIPTION_COLS}
     FROM billing_subscriptions
     WHERE provider = $1 AND provider_subscription_id = $2`,
    [provider, providerSubscriptionId],
  );
}

export async function findLatestSubscriptionForUser(
  userId: string,
  provider: BillingProvider,
): Promise<SubscriptionRow | null> {
  return queryOne<SubscriptionRow>(
    `SELECT ${SUBSCRIPTION_COLS}
     FROM billing_subscriptions
     WHERE user_id = $1 AND provider = $2
     ORDER BY updated_at DESC
     LIMIT 1`,
    [userId, provider],
  );
}

export async function upsertSubscription(
  input: SubscriptionInput,
): Promise<SubscriptionRow> {
  const existing = await findSubscriptionByProviderId(
    input.provider,
    input.providerSubscriptionId,
  );
  if (existing && existing.user_id !== input.userId) {
    throw new ConflictError(
      "This purchase is already linked to another account",
    );
  }
  const row = await queryOne<SubscriptionRow>(
    `INSERT INTO billing_subscriptions (
       user_id, provider, provider_subscription_id, plan, status,
       current_period_start, current_period_end, cancel_at_period_end,
       provider_payload
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     ON CONFLICT (provider, provider_subscription_id) DO UPDATE SET
       plan = EXCLUDED.plan,
       status = EXCLUDED.status,
       current_period_start = EXCLUDED.current_period_start,
       current_period_end = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       provider_payload = EXCLUDED.provider_payload,
       updated_at = now()
     RETURNING ${SUBSCRIPTION_COLS}`,
    [
      input.userId,
      input.provider,
      input.providerSubscriptionId,
      input.plan,
      input.status,
      input.currentPeriodStart,
      input.currentPeriodEnd,
      input.cancelAtPeriodEnd,
      JSON.stringify(input.providerPayload),
    ],
  );
  if (!row) throw new Error("Failed to store billing subscription");
  if (row.user_id !== input.userId) {
    throw new ConflictError(
      "This purchase is already linked to another account",
    );
  }
  return row;
}
