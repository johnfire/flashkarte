import type { PoolClient, QueryResultRow } from "pg";
import { query, queryOne, withTransaction } from "../../db/client";
import type { CardSense } from "@flashkarte/shared";

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
  // "basic" for ordinary and diagnostic cards; "read" for a lesson, which a client
  // shows for reading and acknowledges instead of rating.
  type: string;
  // Diagnostic cards (Spec 01) also carry `label` and authored `options`; the
  // full content JSONB is returned verbatim so clients can render MC options and
  // resolve remediation targets.
  content: {
    front: string;
    back: string;
    label?: string | null;
    options?: { text: string; goto: string }[];
    // Spec 10: present only on cards that are one meaning of a word block.
    sense?: CardSense | null;
  };
  category: string | null;
  // The card's fixed place in the deck (0-based), independent of study
  // order, so a client can show "card 5 of 20" for reference/support even
  // while the scheduler studies cards out of sequence.
  position: number;
}

// A caller may study/rate a card they don't own when they've added its deck
// to their list and it is an app (official) deck or shared with them — the
// same rule as subscribedOrOwned in decks.repository.ts, including decks in an
// added shared deck-course. `$N` is the caller's
// user_id parameter position in that query; `cardAlias`/`deckAlias` must
// already be joined (cards.deck_id = decks.id) in the surrounding query.
function officialOrOwned(
  cardAlias: string,
  deckAlias: string,
  userIdParam: number,
): string {
  return `(${cardAlias}.user_id = $${userIdParam}
     OR (EXISTS (
       SELECT 1 FROM deck_subscriptions sub
       WHERE sub.deck_id = ${deckAlias}.id AND sub.user_id = $${userIdParam}
     ) AND (
       ${deckAlias}.is_official
       OR deck_shared_with(${deckAlias}.id, $${userIdParam}::uuid)
     ))
     OR deck_in_added_shared_course(${deckAlias}.id, $${userIdParam}::uuid))`;
}

/**
 * `includeLessons` opts a client in to reading cards. Clients that predate them never
 * ask, so they never receive a card they would show as a flip card and rate; a lesson
 * the learner has already read is never offered again.
 *
 * `admissibleNewIds` is the learning-block gate: when given, a never-seen `basic` card
 * is only offered if its id is in the list. Seen cards (reviews), lessons and branch
 * cards are never gated. null means no gate.
 */
export function getDueAndNewCards(
  userId: string,
  deckId: string,
  limit: number,
  includeLessons = false,
  admissibleNewIds: string[] | null = null,
) {
  return query<CardForStudy>(
    // Ordered decks (decks.is_ordered) study in strict global position order;
    // unordered decks keep reviewed/due-first grouping (the CASE is NULL for
    // every row, so the remaining keys stay in control). Regression fixture:
    // scripts/verify-ordered-study-order.sql — update both together.
    `SELECT c.id, c.type, c.content, c.category, c.position
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND ${officialOrOwned("c", "d", 1)}
       AND (p.id IS NULL OR p.due_at <= now())
       AND (c.type <> 'read' OR ($4::boolean AND NOT EXISTS (
         SELECT 1 FROM card_reads r WHERE r.card_id = c.id AND r.user_id = $1
       )))
       AND ($5::uuid[] IS NULL OR p.id IS NOT NULL OR c.type <> 'basic'
            OR c.id = ANY($5::uuid[]))
     ORDER BY
       CASE WHEN d.is_ordered THEN c.position END ASC NULLS LAST,
       (p.id IS NULL) ASC, p.due_at ASC NULLS LAST, c.position ASC
     LIMIT $3`,
    [userId, deckId, limit, includeLessons, admissibleNewIds],
  );
}

/**
 * Fallback when nothing is due: a random practice round so finishing a deck
 * doesn't dead-end into "nothing due" until the schedule catches up. Only
 * `basic` cards (ordinary + diagnostic) qualify — branch cards have no SR
 * state and would show up as blank/unstudiable if pulled in here.
 * `onlyIds` narrows the draw (to the current learning block); null draws from
 * the whole deck.
 */
export function getRandomCards(
  userId: string,
  deckId: string,
  limit: number,
  onlyIds: string[] | null = null,
) {
  return query<CardForStudy>(
    `SELECT c.id, c.type, c.content, c.category, c.position
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.deck_id = $2 AND c.type = 'basic' AND ${officialOrOwned("c", "d", 1)}
       AND ($4::uuid[] IS NULL OR c.id = ANY($4::uuid[]))
     ORDER BY random()
     LIMIT $3`,
    [userId, deckId, limit, onlyIds],
  );
}

/**
 * Every studiable (`basic`) card of a deck in deck order, with just what learning
 * blocks need: whether the learner has seen it and its latest rating. The order
 * must match the new-card order of getDueAndNewCards (position, then id as a
 * tie-break) so blocks are the cards a learner actually meets in sequence.
 */
export function getBlockCards(userId: string, deckId: string) {
  return query<{ id: string; seen: boolean; last_rating: number | null }>(
    `SELECT c.id, (p.id IS NOT NULL) AS seen, p.last_rating
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND c.type = 'basic' AND ${officialOrOwned("c", "d", 1)}
     ORDER BY c.position ASC, c.id ASC`,
    [userId, deckId],
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
    last_rating: number | null;
  }>(
    // last_rating is what tells the scheduler a card is staying on Easy; drop
    // it and every Easy review restarts at the entry interval.
    `SELECT repetitions, ease_factor, interval_days, last_rating
     FROM card_progress WHERE user_id = $1 AND card_id = $2`,
    [userId, cardId],
    client,
  );
}

/**
 * Every sense card of the given words in a deck, with the `repetitions` the phase gate
 * needs. Kept as a second query rather than folded into getDueAndNewCards: that query's
 * ordered-deck ordering is covered by scripts/verify-ordered-study-order.sql and is not
 * worth destabilising to add a join.
 */
export function getSenseCardsForWords(
  userId: string,
  deckId: string,
  words: string[],
) {
  return query<CardForStudy & { repetitions: number | null }>(
    `SELECT c.id, c.type, c.content, c.category, c.position, p.repetitions
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE c.deck_id = $2 AND ${officialOrOwned("c", "d", 1)}
       AND c.content->'sense'->>'word' = ANY($3::text[])
     ORDER BY c.position ASC`,
    [userId, deckId, words],
  );
}

export function cardBelongsToUser(
  userId: string,
  cardId: string,
  client?: PoolClient,
) {
  return queryFirst<{ id: string }>(
    `SELECT c.id FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.id = $1 AND ${officialOrOwned("c", "d", 2)}`,
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
    `SELECT c.id FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE ${officialOrOwned("c", "d", 1)} AND c.id = ANY($2::uuid[])`,
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
     WHERE c.deck_id = $2 AND c.user_id = $1 AND c.type <> 'read'`,
    [userId, deckId],
  );
}

/** Which of these cards are lessons the caller may read (owned, or official and subscribed). */
export async function getReadableLessonIds(
  userId: string,
  cardIds: string[],
): Promise<Set<string>> {
  if (cardIds.length === 0) return new Set();
  const lessons = await query<{ id: string }>(
    `SELECT c.id FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.type = 'read' AND ${officialOrOwned("c", "d", 1)} AND c.id = ANY($2::uuid[])`,
    [userId, cardIds],
  );
  return new Set(lessons.map((lesson) => lesson.id));
}

/**
 * Records that the learner has read these lessons. The first read wins: a replayed
 * offline batch does nothing, so a read time can never be moved or duplicated.
 */
export async function insertCardReads(
  userId: string,
  reads: { cardId: string; readAt: Date }[],
): Promise<void> {
  if (reads.length === 0) return;
  await query(
    `INSERT INTO card_reads (user_id, card_id, read_at)
     SELECT $1, r.card_id, r.read_at
     FROM unnest($2::uuid[], $3::timestamptz[]) AS r(card_id, read_at)
     ON CONFLICT (user_id, card_id) DO NOTHING`,
    [userId, reads.map((r) => r.cardId), reads.map((r) => r.readAt)],
  );
}
