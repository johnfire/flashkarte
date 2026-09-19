import { z } from "zod";
import { get } from "../api";

/**
 * A card, named either by its UUID or by deck and the card number the app
 * shows in Manage and Study (1-based: the card's position plus one).
 */
export const cardReferenceSchema = z.union([
  z.string().uuid(),
  z.object({
    deck_id: z.string().uuid(),
    card_number: z.number().int().min(1),
  }),
]);
export type CardReference = z.infer<typeof cardReferenceSchema>;

interface DeckCards {
  cards: Array<{ id: string; position: number }>;
}

/** Pure: turns references into card ids, given the decks they point into. */
export function resolveCardReferences(
  references: CardReference[],
  decksById: Map<string, DeckCards>,
): string[] {
  const ids = references.map((reference) => {
    if (typeof reference === "string") return reference;
    const card = decksById
      .get(reference.deck_id)
      ?.cards.find((c) => c.position === reference.card_number - 1);
    if (!card) {
      throw new Error(
        `Deck ${reference.deck_id} has no card number ${reference.card_number}`,
      );
    }
    return card.id;
  });
  return [...new Set(ids)];
}

async function fetchReferencedDecks(
  references: CardReference[],
): Promise<Map<string, DeckCards>> {
  const deckIds = new Set<string>();
  for (const reference of references) {
    if (typeof reference !== "string") deckIds.add(reference.deck_id);
  }
  const decks = await Promise.all(
    [...deckIds].map(
      async (deckId) =>
        [
          deckId,
          await get<DeckCards>(`/api/decks/${encodeURIComponent(deckId)}`),
        ] as const,
    ),
  );
  return new Map(decks);
}

export async function resolveCardIds(
  references: CardReference[],
): Promise<string[]> {
  if (references.length === 0) return [];
  return resolveCardReferences(
    references,
    await fetchReferencedDecks(references),
  );
}
