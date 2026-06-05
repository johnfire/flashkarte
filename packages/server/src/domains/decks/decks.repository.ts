import { query, queryOne } from "../../db/client";
import { ParsedCard } from "@flashkarte/shared";

export interface DeckRow {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  is_ordered: boolean;
}

const DECK_COLS =
  "id, title, source_filename, created_at, updated_at, is_public, is_ordered";

export function createDeck(
  userId: string,
  title: string,
  sourceFilename: string | null,
) {
  return queryOne<DeckRow>(
    `INSERT INTO decks (user_id, title, source_filename)
     VALUES ($1, $2, $3)
     RETURNING ${DECK_COLS}`,
    [userId, title, sourceFilename],
  );
}

export async function insertCards(
  userId: string,
  deckId: string,
  cards: ParsedCard[],
) {
  let i = 0;
  for (const c of cards) {
    await query(
      `INSERT INTO cards (user_id, deck_id, type, content, category, position)
       VALUES ($1, $2, 'basic', $3, $4, $5)`,
      [
        userId,
        deckId,
        JSON.stringify({ front: c.front, back: c.back }),
        c.category,
        i++,
      ],
    );
  }
}

export async function appendCards(
  userId: string,
  deckId: string,
  cards: ParsedCard[],
) {
  const maxRow = await queryOne<{ max: number | null }>(
    "SELECT max(position) AS max FROM cards WHERE deck_id = $1 AND user_id = $2",
    [deckId, userId],
  );
  let i = (maxRow?.max ?? -1) + 1;
  for (const c of cards) {
    await query(
      `INSERT INTO cards (user_id, deck_id, type, content, category, position)
       VALUES ($1, $2, 'basic', $3, $4, $5)`,
      [
        userId,
        deckId,
        JSON.stringify({ front: c.front, back: c.back }),
        c.category,
        i++,
      ],
    );
  }
}

export interface DeckListRow extends DeckRow {
  card_count: string;
  due_count: string;
  viewed_count: string;
  new_count: string;
  again_count: string;
  hard_count: string;
  good_count: string;
  easy_count: string;
}

export function listDecksWithCounts(userId: string) {
  return query<DeckListRow>(
    `SELECT d.id, d.title, d.source_filename, d.created_at, d.updated_at, d.is_public, d.is_ordered,
       s.total AS card_count,
       s.due AS due_count,
       s.viewed AS viewed_count,
       s.new_cards AS new_count,
       s.again AS again_count,
       s.hard AS hard_count,
       s.good AS good_count,
       s.easy AS easy_count
     FROM decks d
     LEFT JOIN LATERAL (
       SELECT
         count(*) AS total,
         count(*) FILTER (WHERE p.id IS NULL OR p.due_at <= now()) AS due,
         count(*) FILTER (WHERE p.id IS NOT NULL) AS viewed,
         count(*) FILTER (WHERE p.id IS NULL) AS new_cards,
         count(*) FILTER (WHERE p.last_rating <= 2) AS again,
         count(*) FILTER (WHERE p.last_rating = 3) AS hard,
         count(*) FILTER (WHERE p.last_rating = 4) AS good,
         count(*) FILTER (WHERE p.last_rating = 5) AS easy
       FROM cards c
       LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
       WHERE c.deck_id = d.id
     ) s ON true
     WHERE d.user_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
}

export function getDeck(userId: string, id: string) {
  return queryOne<DeckRow>(
    `SELECT ${DECK_COLS} FROM decks WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export function getCards(userId: string, deckId: string) {
  return query<{
    id: string;
    type: string;
    content: { front: string; back: string };
    category: string | null;
    position: number;
  }>(
    `SELECT id, type, content, category, position FROM cards
     WHERE deck_id = $1 AND user_id = $2 ORDER BY position ASC`,
    [deckId, userId],
  );
}

export function renameDeck(userId: string, id: string, title: string) {
  return queryOne<DeckRow>(
    `UPDATE decks SET title = $1, updated_at = now()
     WHERE id = $2 AND user_id = $3
     RETURNING ${DECK_COLS}`,
    [title, id, userId],
  );
}

export function setDeckPublic(userId: string, id: string, isPublic: boolean) {
  return queryOne<DeckRow>(
    `UPDATE decks
       SET is_public = $1,
           published_at = CASE WHEN $1 THEN now() ELSE NULL END,
           updated_at = now()
     WHERE id = $2 AND user_id = $3
     RETURNING ${DECK_COLS}`,
    [isPublic, id, userId],
  );
}

export function setDeckOrdered(userId: string, id: string, isOrdered: boolean) {
  return queryOne<DeckRow>(
    `UPDATE decks SET is_ordered = $1, updated_at = now()
     WHERE id = $2 AND user_id = $3
     RETURNING ${DECK_COLS}`,
    [isOrdered, id, userId],
  );
}

// Admin moderation: unpublish a deck regardless of owner.
export function adminUnpublish(id: string) {
  return queryOne<{ id: string }>(
    `UPDATE decks SET is_public = false, published_at = NULL, updated_at = now()
     WHERE id = $1 RETURNING id`,
    [id],
  );
}

export function deleteDeck(userId: string, id: string) {
  return queryOne<{ id: string }>(
    "DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId],
  );
}
