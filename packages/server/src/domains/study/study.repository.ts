import type { PoolClient, QueryResultRow } from "pg";
import { query, queryOne, withTransaction } from "../../db/client";

async function queryRows<T extends QueryResultRow>(
  sql: string,
  params: unknown[],
  client?: PoolClient,
): Promise<T[]> {
  if (!client) return query<T>(sql, params);
  const queryResult = await client.query<T>(sql, params);
  return queryResult.rows;
}

async function queryFirst<T extends QueryResultRow>(
  sql: string,
  params: unknown[],
  client?: PoolClient,
): Promise<T | null> {
  if (!client) return queryOne<T>(sql, params);
  const rows = await queryRows<T>(sql, params, client);
  return rows[0] ?? null;
}

export interface CardForStudy {
  id: string;
  // Diagnostic cards (Spec 01) also carry `label` and authored `options`; the
  // full content JSONB is returned verbatim so clients can render MC options and
  // resolve remediation targets.
  content: {
    front: string;
    back: string;
    label?: string | null;
    options?: { text: string; goto: string }[];
  };
  category: string | null;
}

export function getDueAndNewCards(
  userId: string,
  deckId: string,
  limit: number,
) {
  return query<CardForStudy>(
    // Ordered decks (decks.is_ordered) study in strict global position order;
    // unordered decks keep reviewed/due-first grouping (the CASE is NULL for
    // every row, so the remaining keys stay in control). Regression fixture:
    // scripts/verify-ordered-study-order.sql — update both together.
    `SELECT c.id, c.content, c.category
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND c.user_id = $1
       AND (p.id IS NULL OR p.due_at <= now())
     ORDER BY
       CASE WHEN d.is_ordered THEN c.position END ASC NULLS LAST,
       (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
     LIMIT $3`,
    [userId, deckId, limit],
  );
}

export function getProgressRow(
  userId: string,
  cardId: string,
  client?: PoolClient,
) {
  return queryFirst<{
    repetitions: number;
    ease_factor: number;
    interval_days: number;
  }>(
    `SELECT repetitions, ease_factor, interval_days
     FROM card_progress WHERE user_id = $1 AND card_id = $2`,
    [userId, cardId],
    client,
  );
}

export function cardBelongsToUser(
  userId: string,
  cardId: string,
  client?: PoolClient,
) {
  return queryFirst<{ id: string }>(
    "SELECT id FROM cards WHERE id = $1 AND user_id = $2",
    [cardId, userId],
    client,
  );
}

export async function getOwnedCardIds(
  userId: string,
  cardIds: string[],
): Promise<Set<string>> {
  if (cardIds.length === 0) return new Set();
  const ownedCards = await query<{ id: string }>(
    `SELECT id FROM cards
     WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [userId, cardIds],
  );
  return new Set(ownedCards.map((card) => card.id));
}

export function withCardProgressLock<T>(
  userId: string,
  cardId: string,
  action: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTransaction(async (client) => {
    const lockKey = `${userId}:${cardId}`;
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
      [lockKey],
    );
    return action(client);
  });
}

export function upsertProgress(
  userId: string,
  cardId: string,
  progress: {
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueAt: Date;
    lastRating: number;
  },
  client?: PoolClient,
) {
  return queryRows(
    `INSERT INTO card_progress
       (user_id, card_id, repetitions, ease_factor, interval_days, due_at, last_rating, last_reviewed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, now())
     ON CONFLICT (user_id, card_id) DO UPDATE
       SET repetitions = EXCLUDED.repetitions, ease_factor = EXCLUDED.ease_factor,
           interval_days = EXCLUDED.interval_days, due_at = EXCLUDED.due_at,
           last_rating = EXCLUDED.last_rating,
           last_reviewed_at = now(), updated_at = now()`,
    [
      userId,
      cardId,
      progress.repetitions,
      progress.easeFactor,
      progress.intervalDays,
      progress.dueAt,
      progress.lastRating,
    ],
    client,
  );
}

export async function insertReviewEvent(
  userId: string,
  reviewEvent: {
    event_id: string;
    card_id: string;
    rating: number;
    reviewed_at: string;
    option_index?: number | null;
  },
  client?: PoolClient,
): Promise<boolean> {
  const rows = await queryRows<{ event_id: string }>(
    `INSERT INTO review_events (event_id, user_id, card_id, rating, reviewed_at, option_index)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [
      reviewEvent.event_id,
      userId,
      reviewEvent.card_id,
      reviewEvent.rating,
      reviewEvent.reviewed_at,
      reviewEvent.option_index ?? null,
    ],
    client,
  );
  return rows.length > 0;
}

export function upsertProgressAt(
  userId: string,
  cardId: string,
  progress: {
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueAt: Date;
    lastRating: number;
    lastReviewedAt: Date;
  },
  client?: PoolClient,
) {
  return queryRows(
    `INSERT INTO card_progress
       (user_id, card_id, repetitions, ease_factor, interval_days, due_at, last_rating, last_reviewed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (user_id, card_id) DO UPDATE
       SET repetitions = EXCLUDED.repetitions, ease_factor = EXCLUDED.ease_factor,
           interval_days = EXCLUDED.interval_days, due_at = EXCLUDED.due_at,
           last_rating = EXCLUDED.last_rating,
           last_reviewed_at = EXCLUDED.last_reviewed_at, updated_at = now()`,
    [
      userId,
      cardId,
      progress.repetitions,
      progress.easeFactor,
      progress.intervalDays,
      progress.dueAt,
      progress.lastRating,
      progress.lastReviewedAt,
    ],
    client,
  );
}

export function getStats(userId: string, deckId: string) {
  return queryOne<{
    total: string;
    new: string;
    due: string;
    learned: string;
    viewed: string;
    again: string;
    hard: string;
    good: string;
    easy: string;
  }>(
    `SELECT
       count(c.*) AS total,
       count(*) FILTER (WHERE p.id IS NULL) AS new,
       count(*) FILTER (WHERE p.id IS NULL OR p.due_at <= now()) AS due,
       count(*) FILTER (WHERE p.repetitions >= 1) AS learned,
       count(*) FILTER (WHERE p.id IS NOT NULL) AS viewed,
       count(*) FILTER (WHERE p.last_rating <= 2) AS again,
       count(*) FILTER (WHERE p.last_rating = 3) AS hard,
       count(*) FILTER (WHERE p.last_rating = 4) AS good,
       count(*) FILTER (WHERE p.last_rating = 5) AS easy
     FROM cards c
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND c.user_id = $1`,
    [userId, deckId],
  );
}
