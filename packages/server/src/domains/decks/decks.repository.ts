import { query, queryOne } from "../../db/client";
import { ParsedCard } from "@flashkarte/shared";

export interface DeckRow {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
}

export function createDeck(
  userId: string,
  title: string,
  sourceFilename: string | null,
) {
  return queryOne<DeckRow>(
    `INSERT INTO decks (user_id, title, source_filename)
     VALUES ($1, $2, $3)
     RETURNING id, title, source_filename, created_at, updated_at`,
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

export function listDecksWithCounts(userId: string) {
  return query<DeckRow & { card_count: string; due_count: string }>(
    `SELECT d.id, d.title, d.source_filename, d.created_at, d.updated_at,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
       (SELECT count(*) FROM cards c
          LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
          WHERE c.deck_id = d.id AND (p.id IS NULL OR p.due_at <= now())) AS due_count
     FROM decks d WHERE d.user_id = $1 ORDER BY d.updated_at DESC`,
    [userId],
  );
}

export function getDeck(userId: string, id: string) {
  return queryOne<DeckRow>(
    `SELECT id, title, source_filename, created_at, updated_at
     FROM decks WHERE id = $1 AND user_id = $2`,
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
     RETURNING id, title, source_filename, created_at, updated_at`,
    [title, id, userId],
  );
}

export function deleteDeck(userId: string, id: string) {
  return queryOne<{ id: string }>(
    "DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id",
    [id, userId],
  );
}
