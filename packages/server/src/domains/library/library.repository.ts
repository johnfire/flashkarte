import { query, queryOne } from "../../db/client";

export interface LibraryDeckRow {
  id: string;
  title: string;
  author: string;
  card_count: string;
  published_at: string;
}

const AUTHOR = "COALESCE(NULLIF(trim(u.display_name), ''), 'Anonymous')";

export function listPublic(q: string | null) {
  return query<LibraryDeckRow>(
    `SELECT d.id, d.title, ${AUTHOR} AS author,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
       d.published_at
     FROM decks d JOIN users u ON u.id = d.user_id
     WHERE d.is_public
       AND ($1::text IS NULL OR d.title ILIKE '%' || $1 || '%')
     ORDER BY d.published_at DESC NULLS LAST
     LIMIT 100`,
    [q],
  );
}

export function getPublicDeck(id: string) {
  return queryOne<LibraryDeckRow & { source_filename: string | null }>(
    `SELECT d.id, d.title, d.source_filename, ${AUTHOR} AS author,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
       d.published_at
     FROM decks d JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND d.is_public`,
    [id],
  );
}

export function getPublicCards(deckId: string) {
  return query<{
    type: string;
    content: Record<string, unknown>;
    category: string | null;
    position: number;
  }>(
    `SELECT c.type, c.content, c.category, c.position
     FROM cards c JOIN decks d ON d.id = c.deck_id
     WHERE c.deck_id = $1 AND d.is_public
     ORDER BY c.position ASC`,
    [deckId],
  );
}
