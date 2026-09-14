import { parseDeck } from "@flashkarte/shared";
import { z } from "zod";
import { ValidationError, NotFoundError } from "../../utils/errors";
import {
  parse,
  speechAutoplaySchema,
  speechLangSchema,
  speechRateSchema,
} from "../../utils/validate";
import * as repo from "./decks.repository";
import { validateBranching } from "./branching";
import { validateSenses } from "./senses";

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
  // Speech overrides (Spec 09). Every one is nullable-optional on purpose:
  // absent leaves the stored value alone, explicit null resets it to "inherit
  // the user's global default". speechEnabled is tri-state for the same reason
  // — a boolean could not express "global on, mute this one deck".
  speechEnabled: z
    .boolean({ error: "speechEnabled must be a boolean" })
    .nullable()
    .optional(),
  speechFrontLang: speechLangSchema.optional(),
  speechBackLang: speechLangSchema.optional(),
  speechAutoplay: speechAutoplaySchema.nullable().optional(),
  speechRate: speechRateSchema.nullable().optional(),
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
  validateSenses(parsed.cards);
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
  // Appending sees only this request's markdown, so the words already in the deck
  // have to be read back or a word could be split across two uploads.
  validateSenses(parsed.cards, await repo.getSenseWords(userId, deckId));
  await repo.appendCards(userId, deckId, parsed.cards);
  return { deck_id: deckId, added: parsed.cards.length };
}

export function list(userId: string) {
  return repo.listDecksWithCounts(userId);
}

// Shared by every App Decks browse endpoint: an optional title search plus
// limit/offset, clamped to sane bounds so a caller can't force an unbounded
// scan of what may eventually be thousands of rows.
const paginationSchema = z.object({
  q: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : null),
    z.string().nullable(),
  ),
  limit: z.coerce
    .number({ error: "limit must be a number" })
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50),
  offset: z.coerce
    .number({ error: "offset must be a number" })
    .int()
    .min(0)
    .optional()
    .default(0),
  // Scopes a browse query to one category/subcategory: omitted = no filter
  // (the flat, cross-category search box), "uncategorized" = the
  // uncategorized bucket, anything else = that category/subcategory id.
  categoryId: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined),
    z.string().optional(),
  ),
});

function parsePagination(query: unknown) {
  const { categoryId, ...rest } = parse(paginationSchema, query ?? {});
  const categoryFilter: string | null | undefined =
    categoryId === undefined
      ? undefined
      : categoryId === "uncategorized"
        ? null
        : categoryId;
  return { ...rest, categoryFilter };
}

function toOfficialDeck(row: repo.OfficialDeckRow) {
  return {
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    card_count: Number(row.card_count),
    subscribed: row.subscribed,
    category_id: row.category_id,
  };
}

/** Standalone official decks (no collection) — the "browse" list. */
export async function listStandaloneOfficial(userId: string, query: unknown) {
  const { q, limit, offset, categoryFilter } = parsePagination(query);
  const rows = await repo.listStandaloneOfficial(
    userId,
    q,
    limit,
    offset,
    categoryFilter,
  );
  return rows.map(toOfficialDeck);
}

export async function listCollections(query: unknown) {
  const { q, limit, offset, categoryFilter } = parsePagination(query);
  const rows = await repo.listOfficialCollections(
    q,
    limit,
    offset,
    categoryFilter,
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    deck_count: Number(row.deck_count),
    category_id: row.category_id,
  }));
}

export async function getCollectionDecks(
  userId: string,
  collectionId: string,
  query: unknown,
) {
  const collection = await repo.getCollection(collectionId);
  if (!collection) throw new NotFoundError("Collection not found");
  const { q, limit, offset } = parsePagination(query);
  const rows = await repo.listCollectionDecks(
    userId,
    collectionId,
    q,
    limit,
    offset,
  );
  return { ...collection, decks: rows.map(toOfficialDeck) };
}

export async function subscribeAll(userId: string, collectionId: string) {
  const collection = await repo.getCollection(collectionId);
  if (!collection) throw new NotFoundError("Collection not found");
  return repo.subscribeAllInCollection(userId, collectionId);
}

export async function subscribe(userId: string, deckId: string) {
  const ok = await repo.subscribeOfficial(userId, deckId);
  if (!ok) throw new NotFoundError("Official deck not found");
}

export async function unsubscribe(userId: string, deckId: string) {
  await repo.unsubscribeOfficial(userId, deckId);
}

export async function get(userId: string, id: string) {
  const deck = await repo.getDeck(userId, id);
  if (!deck) throw new NotFoundError("Deck not found");
  const cards = await repo.getCards(userId, id);
  return { ...deck, cards };
}

/**
 * The deck row without its cards.
 *
 * The study screen needs a deck's speech settings before it can speak, and
 * `get()` would ship up to MAX_CARDS_PER_DECK cards to answer that. Kept
 * separate from the study batch response, which stays a bare array so the
 * Android clients already in the field are unaffected.
 */
export async function getSettings(userId: string, id: string) {
  const deck = await repo.getDeck(userId, id);
  if (!deck) throw new NotFoundError("Deck not found");
  return deck;
}

export async function update(
  userId: string,
  id: string,
  patchInput: {
    title?: unknown;
    isPublic?: unknown;
    isOrdered?: unknown;
    speechEnabled?: unknown;
    speechFrontLang?: unknown;
    speechBackLang?: unknown;
    speechAutoplay?: unknown;
    speechRate?: unknown;
  },
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

  const speech: repo.DeckSpeechPatch = {};
  if (patch.speechEnabled !== undefined)
    speech.speech_enabled = patch.speechEnabled;
  if (patch.speechFrontLang !== undefined)
    speech.speech_front_lang = patch.speechFrontLang;
  if (patch.speechBackLang !== undefined)
    speech.speech_back_lang = patch.speechBackLang;
  if (patch.speechAutoplay !== undefined)
    speech.speech_autoplay = patch.speechAutoplay;
  if (patch.speechRate !== undefined) speech.speech_rate = patch.speechRate;
  if (Object.keys(speech).length > 0) {
    deck = (await repo.setDeckSpeech(userId, id, speech)) ?? deck;
  }
  return deck;
}

export async function remove(userId: string, id: string) {
  const deleted = await repo.deleteDeck(userId, id);
  if (!deleted) throw new NotFoundError("Deck not found");
}
