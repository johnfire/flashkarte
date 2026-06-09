import type { ParsedCard } from "@flashkarte/shared";
import { NotFoundError } from "../../utils/errors";
import * as repo from "./library.repository";
import * as decksRepo from "../decks/decks.repository";

export interface LibraryDeck {
  id: string;
  title: string;
  author: string;
  cardCount: number;
  publishedAt: string | null;
}

function toLibraryDeck(row: repo.LibraryDeckRow): LibraryDeck {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    cardCount: Number(row.card_count),
    publishedAt: row.published_at
      ? new Date(row.published_at).toISOString()
      : null,
  };
}

export async function list(q: unknown): Promise<LibraryDeck[]> {
  const search = typeof q === "string" && q.trim() ? q.trim() : null;
  const rows = await repo.listPublic(search);
  return rows.map(toLibraryDeck);
}

export async function get(id: string) {
  const deck = await repo.getPublicDeck(id);
  if (!deck) throw new NotFoundError("Deck not found");
  const cards = await repo.getPublicCards(id);
  return {
    ...toLibraryDeck(deck),
    cards: cards.map((c) => ({
      front: (c.content.front as string) ?? "",
      back: (c.content.back as string) ?? "",
      category: c.category,
    })),
  };
}

export async function getPreview(id: string) {
  const deck = await repo.getPublicDeck(id);
  if (!deck) return null;
  const cards = await repo.getPublicCards(id);
  return {
    id: deck.id,
    title: deck.title,
    author: deck.author,
    cardCount: Number(deck.card_count),
    publishedAt: deck.published_at
      ? new Date(deck.published_at).toISOString()
      : null,
    cards: cards.map((c) => ({
      front: (c.content.front as string) ?? "",
      category: c.category,
    })),
  };
}

/** Deep-copy a public deck into the caller's account as a private deck. */
export async function clone(userId: string, id: string) {
  const source = await repo.getPublicDeck(id);
  if (!source) throw new NotFoundError("Deck not found");
  const cardRows = await repo.getPublicCards(id);

  const deck = await decksRepo.createDeck(userId, source.title, null);
  if (!deck) throw new Error("Failed to create deck");

  const cards: ParsedCard[] = cardRows.map((c) =>
    decksRepo.rowToParsedCard({
      type: c.type,
      content: c.content,
      category: c.category,
    }),
  );
  await decksRepo.insertCards(userId, deck.id, cards);

  return { id: deck.id, title: deck.title, card_count: cards.length };
}
