import { query, queryOne } from "../../db/client";

export interface CardForStudy {
  id: string;
  content: { front: string; back: string };
  category: string | null;
}

export function getDueAndNewCards(
  userId: string,
  deckId: string,
  limit: number,
) {
  return query<CardForStudy>(
    `SELECT c.id, c.content, c.category
     FROM cards c
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND c.user_id = $1
       AND (p.id IS NULL OR p.due_at <= now())
     ORDER BY (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
     LIMIT $3`,
    [userId, deckId, limit],
  );
}

export function getProgressRow(userId: string, cardId: string) {
  return queryOne<{
    repetitions: number;
    ease_factor: number;
    interval_days: number;
  }>(
    `SELECT repetitions, ease_factor, interval_days
     FROM card_progress WHERE user_id = $1 AND card_id = $2`,
    [userId, cardId],
  );
}

export function cardBelongsToUser(userId: string, cardId: string) {
  return queryOne<{ id: string }>(
    "SELECT id FROM cards WHERE id = $1 AND user_id = $2",
    [cardId, userId],
  );
}

export function upsertProgress(
  userId: string,
  cardId: string,
  s: {
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueAt: Date;
    lastRating: number;
  },
) {
  return query(
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
      s.repetitions,
      s.easeFactor,
      s.intervalDays,
      s.dueAt,
      s.lastRating,
    ],
  );
}

export async function insertReviewEvent(
  userId: string,
  ev: {
    event_id: string;
    card_id: string;
    rating: number;
    reviewed_at: string;
  },
): Promise<boolean> {
  const rows = await query<{ event_id: string }>(
    `INSERT INTO review_events (event_id, user_id, card_id, rating, reviewed_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING event_id`,
    [ev.event_id, userId, ev.card_id, ev.rating, ev.reviewed_at],
  );
  return rows.length > 0;
}

export function upsertProgressAt(
  userId: string,
  cardId: string,
  s: {
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueAt: Date;
    lastRating: number;
    lastReviewedAt: Date;
  },
) {
  return query(
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
      s.repetitions,
      s.easeFactor,
      s.intervalDays,
      s.dueAt,
      s.lastRating,
      s.lastReviewedAt,
    ],
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
