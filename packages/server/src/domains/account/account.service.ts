import { NotFoundError } from "../../utils/errors";
import * as repo from "./account.repository";

export interface AccountExport {
  exportedAt: string;
  profile: {
    email: string;
    displayName: string | null;
    role: string;
    accountType: string;
    language: string | null;
    emailVerifiedAt: string | null;
    createdAt: string;
  };
  decks: Array<{
    id: string;
    title: string;
    sourceFilename: string | null;
    isPublic: boolean;
    isOrdered: boolean;
    createdAt: string;
    updatedAt: string;
    cards: Array<{
      id: string;
      type: string;
      content: unknown;
      category: string | null;
      position: number;
      createdAt: string;
      updatedAt: string;
    }>;
  }>;
  cardProgress: Array<{
    cardId: string;
    repetitions: number;
    easeFactor: number;
    intervalDays: number;
    dueAt: string;
    lastReviewedAt: string | null;
    lastRating: number | null;
  }>;
  reviewEvents: Array<{
    eventId: string;
    cardId: string;
    rating: number;
    reviewedAt: string;
    optionIndex: number | null;
    createdAt: string;
  }>;
  apiKeys: Array<{
    name: string;
    keyPrefix: string;
    scope: string;
    createdAt: string;
  }>;
}

/**
 * Assemble everything the user owns as one JSON document (§13.3 data
 * portability). API keys are listed as metadata only — the secret is a
 * credential, not personal data, and must never be re-exposed. Flashcard
 * datasets are small, so this is synchronous; if payloads ever approach
 * ~5MB, switch to a background job + notification.
 */
export async function exportData(userId: string): Promise<AccountExport> {
  const profile = await repo.findProfile(userId);
  if (!profile) throw new NotFoundError("User not found");

  const [decks, cards, progress, reviewEvents, apiKeys] = await Promise.all([
    repo.findDecks(userId),
    repo.findCards(userId),
    repo.findProgress(userId),
    repo.findReviewEvents(userId),
    repo.findApiKeyMeta(userId),
  ]);

  const cardsByDeck = new Map<string, repo.CardRow[]>();
  for (const card of cards) {
    const list = cardsByDeck.get(card.deck_id) ?? [];
    list.push(card);
    cardsByDeck.set(card.deck_id, list);
  }

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      email: profile.email,
      displayName: profile.display_name,
      role: profile.role,
      accountType: profile.account_type,
      language: profile.language,
      emailVerifiedAt: profile.email_verified_at,
      createdAt: profile.created_at,
    },
    decks: decks.map((deck) => ({
      id: deck.id,
      title: deck.title,
      sourceFilename: deck.source_filename,
      isPublic: deck.is_public,
      isOrdered: deck.is_ordered,
      createdAt: deck.created_at,
      updatedAt: deck.updated_at,
      cards: (cardsByDeck.get(deck.id) ?? []).map((card) => ({
        id: card.id,
        type: card.type,
        content: card.content,
        category: card.category,
        position: card.position,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      })),
    })),
    cardProgress: progress.map((p) => ({
      cardId: p.card_id,
      repetitions: p.repetitions,
      easeFactor: p.ease_factor,
      intervalDays: p.interval_days,
      dueAt: p.due_at,
      lastReviewedAt: p.last_reviewed_at,
      lastRating: p.last_rating,
    })),
    reviewEvents: reviewEvents.map((e) => ({
      eventId: e.event_id,
      cardId: e.card_id,
      rating: e.rating,
      reviewedAt: e.reviewed_at,
      optionIndex: e.option_index,
      createdAt: e.created_at,
    })),
    apiKeys: apiKeys.map((k) => ({
      name: k.name,
      keyPrefix: k.key_prefix,
      scope: k.scope,
      createdAt: k.created_at,
    })),
  };
}
