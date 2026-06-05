import { parseDeck } from "@flashkarte/shared";
import { ValidationError, NotFoundError } from "../../utils/errors";
import * as repo from "./decks.repository";

export async function importDeck(
  userId: string,
  markdown: unknown,
  filename: string | null = null,
) {
  if (typeof markdown !== "string" || !markdown.trim()) {
    throw new ValidationError("Markdown content is required");
  }
  const parsed = parseDeck(markdown, filename ?? "");
  if (parsed.cards.length === 0) {
    throw new ValidationError("Deck has no cards — check the Markdown format");
  }
  const deck = await repo.createDeck(userId, parsed.title, filename);
  if (!deck) throw new Error("Failed to create deck");
  await repo.insertCards(userId, deck.id, parsed.cards);
  return { ...deck, card_count: parsed.cards.length };
}

export async function appendCards(
  userId: string,
  deckId: string,
  markdown: unknown,
) {
  if (typeof markdown !== "string" || !markdown.trim()) {
    throw new ValidationError("Markdown content is required");
  }
  const deck = await repo.getDeck(userId, deckId);
  if (!deck) throw new NotFoundError("Deck not found");
  const parsed = parseDeck(markdown, "");
  if (parsed.cards.length === 0) {
    throw new ValidationError("No cards found — check the Markdown format");
  }
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
  patch: { title?: unknown; isPublic?: unknown },
) {
  let deck = await repo.getDeck(userId, id);
  if (!deck) throw new NotFoundError("Deck not found");

  if (patch.title !== undefined) {
    if (typeof patch.title !== "string" || !patch.title.trim()) {
      throw new ValidationError("Title is required");
    }
    deck = (await repo.renameDeck(userId, id, patch.title.trim())) ?? deck;
  }
  if (patch.isPublic !== undefined) {
    if (typeof patch.isPublic !== "boolean") {
      throw new ValidationError("isPublic must be a boolean");
    }
    deck = (await repo.setDeckPublic(userId, id, patch.isPublic)) ?? deck;
  }
  return deck;
}

export async function remove(userId: string, id: string) {
  const deleted = await repo.deleteDeck(userId, id);
  if (!deleted) throw new NotFoundError("Deck not found");
}
