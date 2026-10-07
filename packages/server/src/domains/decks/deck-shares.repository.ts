import { query, queryOne } from "../../db/client";
import type { ShareScope } from "../sharing/sharing.repository";

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
       (receives_shares_automatically($1::uuid) OR EXISTS (
         SELECT 1 FROM deck_subscriptions sub
         WHERE sub.deck_id = d.id AND sub.user_id = $1
       )) AS subscribed,
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
