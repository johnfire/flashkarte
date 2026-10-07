import { withUnitCreation } from "../billing/billing.service";
import * as sharing from "../sharing/sharing.service";
import * as repo from "./deck-shares.repository";
import * as decksRepo from "./decks.repository";

/** The deck's current audiences plus the ones this owner may choose from. */
export function getShares(userId: string, deckId: string) {
  return sharing.getShares("deck", userId, deckId);
}

/** Replace the deck's audiences (see sharing.service setShares). */
export function setShares(userId: string, deckId: string, input: unknown) {
  return sharing.setShares("deck", userId, deckId, input);
}

export interface SharedDeck {
  id: string;
  referenceNumber: number;
  title: string;
  contentLanguage: string | null;
  cardCount: number;
  author: string | null;
  subscribed: boolean;
  scopes: sharing.ShareScope[];
}

/** Decks shared with this user by their school, teachers or classmates. */
export async function listSharedWithMe(userId: string): Promise<SharedDeck[]> {
  const rows = await repo.listSharedWithUser(userId);
  return rows.map((row) => ({
    id: row.id,
    referenceNumber: row.reference_number,
    title: row.title,
    contentLanguage: row.content_language,
    cardCount: Number(row.card_count),
    author: row.author,
    subscribed: row.subscribed,
    scopes: row.scopes,
  }));
}

/**
 * Add a deck shared with this user to their own deck list. Unlike an app
 * deck, it counts toward a free account's 10 active units.
 * Returns false when the deck is not shared with them.
 */
export async function subscribeShared(
  userId: string,
  deckId: string,
): Promise<boolean> {
  const shared = await repo.isSharedWith(userId, deckId);
  if (!shared?.shared) return false;
  if (await decksRepo.isSubscribed(userId, deckId)) return true;
  await withUnitCreation(userId, (db) =>
    db.query(
      `INSERT INTO deck_subscriptions (user_id, deck_id) VALUES ($1, $2)
       ON CONFLICT (user_id, deck_id) DO NOTHING`,
      [userId, deckId],
    ),
  );
  return true;
}
