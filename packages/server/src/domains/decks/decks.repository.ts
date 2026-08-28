import { query, queryOne, withTransaction } from "../../db/client";
import { ParsedCard, ParsedOption } from "@flashkarte/shared";
import type { PoolClient } from "pg";

export interface DeckRow {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  is_ordered: boolean;
  speech_enabled: boolean | null;
  speech_front_lang: string | null;
  speech_back_lang: string | null;
  speech_autoplay: string | null;
  speech_rate: number | null;
}

const SPEECH_COLS =
  "speech_enabled, speech_front_lang, speech_back_lang, speech_autoplay, speech_rate";

const DECK_COLS = `id, title, source_filename, created_at, updated_at, is_public, is_ordered, ${SPEECH_COLS}`;

/**
 * Insert many cards in a single multi-row statement on the given transaction
 * client, numbering positions from `startPos`. One round-trip, all-or-nothing.
 */
async function insertCardsBatch(
  client: PoolClient,
  userId: string,
  deckId: string,
  cards: ParsedCard[],
  startPos: number,
): Promise<void> {
  if (cards.length === 0) return;
  const values: unknown[] = [];
  const rows = cards.map((c, idx) => {
    const b = idx * 6;
    values.push(
      userId,
      deckId,
      c.type,
      cardContent(c),
      c.category,
      startPos + idx,
    );
    return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`;
  });
  await client.query(
    `INSERT INTO cards (user_id, deck_id, type, content, category, position)
     VALUES ${rows.join(", ")}`,
    values,
  );
}

/**
 * Create a deck and insert all its cards atomically. A failure mid-way rolls
 * back the whole thing, so we never leave an empty or partially-filled deck.
 */
export function createDeckWithCards(
  userId: string,
  title: string,
  sourceFilename: string | null,
  cards: ParsedCard[],
) {
  return withTransaction(async (client) => {
    const res = await client.query<DeckRow>(
      `INSERT INTO decks (user_id, title, source_filename)
       VALUES ($1, $2, $3)
       RETURNING ${DECK_COLS}`,
      [userId, title, sourceFilename],
    );
    const deck = res.rows[0];
    await insertCardsBatch(client, userId, deck.id, cards, 0);
    return deck;
  });
}

/** Reconstruct a ParsedCard from a stored card row (inverse of cardContent). */
export function rowToParsedCard(row: {
  type: string;
  content: Record<string, unknown>;
  category: string | null;
}): ParsedCard {
  const content = row.content;
  if (row.type === "branch") {
    return {
      type: "branch",
      front: (content.prompt as string) ?? "",
      back: "",
      category: row.category,
      label: (content.label as string | null) ?? null,
      options: (content.options as ParsedOption[]) ?? [],
    };
  }
  // A basic card carries `options` only when it is a diagnostic card (Spec 01).
  return {
    type: "basic",
    front: (content.front as string) ?? "",
    back: (content.back as string) ?? "",
    category: row.category,
    label: (content.label as string | null) ?? null,
    options: (content.options as ParsedOption[]) ?? [],
  };
}

function cardContent(c: ParsedCard): string {
  if (c.type === "branch") {
    return JSON.stringify({
      label: c.label,
      prompt: c.front,
      options: c.options,
    });
  }
  // Basic card. Persist `options` only for diagnostic cards (empty otherwise) so
  // ordinary cards keep their exact historical content shape.
  const content: Record<string, unknown> = { front: c.front, back: c.back };
  if (c.label) content.label = c.label;
  if (c.options.length > 0) content.options = c.options;
  return JSON.stringify(content);
}

/**
 * Append cards to an existing deck atomically. Locks the deck row so concurrent
 * appends compute distinct starting positions (no duplicate positions), and
 * inserts all new cards in a single statement.
 */
export async function appendCards(
  userId: string,
  deckId: string,
  cards: ParsedCard[],
) {
  await withTransaction(async (client) => {
    // Serialize concurrent appends to the same deck.
    const deck = await client.query(
      "SELECT 1 FROM decks WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [deckId, userId],
    );
    if (deck.rowCount === 0) return; // ownership already checked in the service
    const maxRow = await client.query<{ max: number | null }>(
      "SELECT max(position) AS max FROM cards WHERE deck_id = $1 AND user_id = $2",
      [deckId, userId],
    );
    const start = (maxRow.rows[0]?.max ?? -1) + 1;
    await insertCardsBatch(client, userId, deckId, cards, start);
  });
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
  is_branching: boolean;
}

export function listDecksWithCounts(userId: string) {
  return query<DeckListRow>(
    `SELECT d.id, d.title, d.source_filename, d.created_at, d.updated_at, d.is_public, d.is_ordered,
       d.speech_enabled, d.speech_front_lang, d.speech_back_lang, d.speech_autoplay, d.speech_rate,
       s.total AS card_count,
       s.due AS due_count,
       s.viewed AS viewed_count,
       s.new_cards AS new_count,
       s.again AS again_count,
       s.hard AS hard_count,
       s.good AS good_count,
       s.easy AS easy_count,
       s.is_branching
     FROM decks d
     LEFT JOIN LATERAL (
       SELECT
         count(*) AS total,
         COALESCE(bool_or(c.type = 'branch'), false) AS is_branching,
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
    content: Record<string, unknown>;
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

/** The deck-level speech overrides a caller may set. Null means "inherit". */
export interface DeckSpeechPatch {
  speech_enabled?: boolean | null;
  speech_front_lang?: string | null;
  speech_back_lang?: string | null;
  speech_autoplay?: string | null;
  speech_rate?: number | null;
}

const SPEECH_PATCH_COLS = [
  "speech_enabled",
  "speech_front_lang",
  "speech_back_lang",
  "speech_autoplay",
  "speech_rate",
] as const;

/**
 * Apply only the speech columns the caller actually sent.
 *
 * Absent and null are different here: absent leaves the stored value alone,
 * while an explicit null resets that field to "inherit the user default". The
 * SET list is built from a fixed whitelist, never from caller-supplied keys.
 */
export function setDeckSpeech(
  userId: string,
  id: string,
  patch: DeckSpeechPatch,
) {
  const columns = SPEECH_PATCH_COLS.filter((col) => patch[col] !== undefined);
  if (columns.length === 0) return getDeck(userId, id);
  const assignments = columns.map((col, idx) => `${col} = $${idx + 3}`);
  return queryOne<DeckRow>(
    `UPDATE decks SET ${assignments.join(", ")}, updated_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING ${DECK_COLS}`,
    [id, userId, ...columns.map((col) => patch[col] ?? null)],
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
