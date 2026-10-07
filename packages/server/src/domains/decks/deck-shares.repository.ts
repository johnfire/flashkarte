import { query, queryOne, withTransaction } from "../../db/client";

export type ShareScope = "school" | "class" | "teacher_students";

export interface DeckShareRow {
  scope: ShareScope;
  school_id: string | null;
  class_id: string | null;
}

export interface SharedDeckRow {
  id: string;
  reference_number: number;
  title: string;
  content_language: string | null;
  card_count: string;
  author: string | null;
  subscribed: boolean;
  scopes: ShareScope[];
}

/** The owner's deck, if `userId` owns it and it is not an app deck. */
export function findOwnedDeck(userId: string, deckId: string) {
  return queryOne<{ id: string; is_official: boolean }>(
    "SELECT id, is_official FROM decks WHERE id = $1 AND user_id = $2",
    [deckId, userId],
  );
}

export function listShares(deckId: string) {
  return query<DeckShareRow>(
    `SELECT scope, school_id, class_id FROM deck_shares
     WHERE deck_id = $1 ORDER BY scope, created_at`,
    [deckId],
  );
}

export function replaceShares(deckId: string, shares: DeckShareRow[]) {
  return withTransaction(async (db) => {
    await db.query("SELECT id FROM decks WHERE id = $1 FOR UPDATE", [deckId]);
    await db.query("DELETE FROM deck_shares WHERE deck_id = $1", [deckId]);
    for (const share of shares) {
      await db.query(
        `INSERT INTO deck_shares (deck_id, scope, school_id, class_id)
         VALUES ($1, $2, $3, $4)`,
        [deckId, share.scope, share.school_id, share.class_id],
      );
    }
  });
}

/**
 * Decks other people shared with this user through a school, class or
 * "my students" share — not their own, not app decks, not public ones.
 * `scopes` says how it reached them, for the "from your teacher/school" label.
 */
export function listSharedWithUser(userId: string) {
  return query<SharedDeckRow>(
    `SELECT d.id, d.reference_number, d.title, d.content_language,
       (SELECT count(*) FROM cards c WHERE c.deck_id = d.id) AS card_count,
       -- Never the email: a pupil sees a display name or nothing.
       NULLIF(trim(u.display_name), '') AS author,
       EXISTS (
         SELECT 1 FROM deck_subscriptions sub
         WHERE sub.deck_id = d.id AND sub.user_id = $1
       ) AS subscribed,
       ARRAY(
         SELECT DISTINCT s.scope FROM deck_shares s WHERE s.deck_id = d.id
       ) AS scopes
     FROM decks d
     JOIN users u ON u.id = d.user_id
     WHERE d.user_id <> $1
       AND NOT d.is_official
       AND deck_shared_with(d.id, $1::uuid)
     ORDER BY d.title COLLATE de_phonebook ASC`,
    [userId],
  );
}

export function isSharedWith(userId: string, deckId: string) {
  return queryOne<{ shared: boolean }>(
    `SELECT deck_shared_with($1::uuid, $2::uuid) AS shared
     FROM decks WHERE id = $1 AND user_id <> $2 AND NOT is_official`,
    [deckId, userId],
  );
}
