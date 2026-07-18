import { parseDeck } from "@flashkarte/shared";
import { z } from "zod";
import { ValidationError, NotFoundError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import * as repo from "./decks.repository";
import { validateBranching } from "./branching";

// Cap cards per request: bounds the multi-row INSERT (well under Postgres'
// 65535-parameter limit at 6 params/card) and prevents a huge upload from
// becoming a soft DoS.
export const MAX_CARDS_PER_DECK = 5000;
const markdownSchema = z
  .string({ error: "Markdown content is required" })
  .refine((markdown) => markdown.trim().length > 0, {
    message: "Markdown content is required",
  });
const deckUpdateSchema = z.object({
  title: z
    .string({ error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .optional(),
  isPublic: z.boolean({ error: "isPublic must be a boolean" }).optional(),
  isOrdered: z.boolean({ error: "isOrdered must be a boolean" }).optional(),
});

export async function importDeck(
  userId: string,
  markdown: unknown,
  filename: string | null = null,
) {
  const validMarkdown = parse(markdownSchema, markdown);
  const parsed = parseDeck(validMarkdown, filename ?? "");
  if (parsed.cards.length === 0) {
    throw new ValidationError("Deck has no cards — check the Markdown format");
  }
  if (parsed.cards.length > MAX_CARDS_PER_DECK) {
    throw new ValidationError(
      `A deck can have at most ${MAX_CARDS_PER_DECK} cards`,
    );
  }
  validateBranching(parsed.cards);
  const deck = await repo.createDeckWithCards(
    userId,
    parsed.title,
    filename,
    parsed.cards,
  );
  if (!deck) throw new Error("Failed to create deck");
  return { ...deck, card_count: parsed.cards.length };
}

export async function appendCards(
  userId: string,
  deckId: string,
  markdown: unknown,
) {
  const validMarkdown = parse(markdownSchema, markdown);
  const deck = await repo.getDeck(userId, deckId);
  if (!deck) throw new NotFoundError("Deck not found");
  const parsed = parseDeck(validMarkdown, "");
  if (parsed.cards.length === 0) {
    throw new ValidationError("No cards found — check the Markdown format");
  }
  if (parsed.cards.length > MAX_CARDS_PER_DECK) {
    throw new ValidationError(
      `You can add at most ${MAX_CARDS_PER_DECK} cards at once`,
    );
  }
  validateBranching(parsed.cards);
  await repo.appendCards(userId, deckId, parsed.cards);
  return { deck_id: deckId, added: parsed.cards.length };
}

export function list(userId: string) {
  return repo.listDecksWithCounts(userId);
}

export async function get(userId: string, id: string) {
  const deck = await repo.getDeck(userId, id);
  if (!deck) throw new NotFoundError("Deck not found");
  const cards = await repo.getCards(userId, id);
  return { ...deck, cards };
}

export async function update(
  userId: string,
  id: string,
  patchInput: { title?: unknown; isPublic?: unknown; isOrdered?: unknown },
) {
  let deck = await repo.getDeck(userId, id);
  if (!deck) throw new NotFoundError("Deck not found");
  const patch = parse(deckUpdateSchema, patchInput);

  if (patch.title !== undefined) {
    deck = (await repo.renameDeck(userId, id, patch.title)) ?? deck;
  }
  if (patch.isPublic !== undefined) {
    deck = (await repo.setDeckPublic(userId, id, patch.isPublic)) ?? deck;
  }
  if (patch.isOrdered !== undefined) {
    deck = (await repo.setDeckOrdered(userId, id, patch.isOrdered)) ?? deck;
  }
  return deck;
}

export async function remove(userId: string, id: string) {
  const deleted = await repo.deleteDeck(userId, id);
  if (!deleted) throw new NotFoundError("Deck not found");
}
