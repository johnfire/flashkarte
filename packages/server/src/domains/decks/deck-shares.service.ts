import { z } from "zod";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import { withUnitCreation } from "../billing/billing.service";
import { getShareOptions } from "../schools/schools.service";
import * as repo from "./deck-shares.repository";
import * as decksRepo from "./decks.repository";

const shareInputSchema = z.object({
  shares: z
    .array(
      z.object({
        scope: z.enum(["school", "class", "teacher_students"], {
          error: "scope must be school, class or teacher_students",
        }),
        classId: z.uuid({ error: "Invalid class id" }).optional(),
      }),
      { error: "shares must be a list" },
    )
    .max(100, "Too many shares"),
});

export interface DeckShare {
  scope: repo.ShareScope;
  schoolId: string | null;
  classId: string | null;
}

function toShare(row: repo.DeckShareRow): DeckShare {
  return { scope: row.scope, schoolId: row.school_id, classId: row.class_id };
}

async function requireOwnedDeck(userId: string, deckId: string) {
  const deck = await repo.findOwnedDeck(userId, deckId);
  if (!deck) throw new NotFoundError("Deck not found");
  if (deck.is_official) {
    throw new ValidationError("App decks are already shared with everyone");
  }
  return deck;
}

/** The deck's current audiences plus the ones this owner may choose from. */
export async function getShares(userId: string, deckId: string) {
  await requireOwnedDeck(userId, deckId);
  const [shares, options] = await Promise.all([
    repo.listShares(deckId),
    getShareOptions(userId),
  ]);
  return { shares: shares.map(toShare), options };
}

/**
 * Replace the deck's audiences. Every requested audience is checked against
 * what this owner is allowed to share with right now; one disallowed entry
 * rejects the whole request, so a deck is never half-shared.
 */
export async function setShares(
  userId: string,
  deckId: string,
  input: unknown,
) {
  await requireOwnedDeck(userId, deckId);
  const { shares } = parse(shareInputSchema, input);
  const options = await getShareOptions(userId);
  const allowedClassIds = new Set(options.classes.map((c) => c.id));

  const rows: repo.DeckShareRow[] = [];
  const seen = new Set<string>();
  for (const share of shares) {
    let row: repo.DeckShareRow;
    if (share.scope === "school") {
      if (!options.canShareWithSchool || !options.school) {
        throw new ValidationError("You cannot share with a school");
      }
      row = { scope: "school", school_id: options.school.id, class_id: null };
    } else if (share.scope === "class") {
      if (!share.classId || !allowedClassIds.has(share.classId)) {
        throw new ValidationError("You can only share with your own classes");
      }
      row = { scope: "class", school_id: null, class_id: share.classId };
    } else {
      if (!options.canShareWithAllStudents) {
        throw new ValidationError(
          "Only a teacher can share with their students",
        );
      }
      row = { scope: "teacher_students", school_id: null, class_id: null };
    }
    const key = `${row.scope}:${row.school_id ?? row.class_id ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      rows.push(row);
    }
  }

  await repo.replaceShares(deckId, rows);
  return { shares: (await repo.listShares(deckId)).map(toShare), options };
}

export interface SharedDeck {
  id: string;
  referenceNumber: number;
  title: string;
  contentLanguage: string | null;
  cardCount: number;
  author: string | null;
  subscribed: boolean;
  scopes: repo.ShareScope[];
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
