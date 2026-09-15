import type {
  SpeechAutoplay,
  CardSense,
  WordPhase,
  ParsedOption,
} from "@flashkarte/shared";

export type AccountType = "free" | "paid" | "admin-gifted" | "admin";

/** A deck's speech overrides. Null means "inherit the global default". */
export interface DeckSpeech {
  speech_enabled: boolean | null;
  speech_front_lang: string | null;
  speech_back_lang: string | null;
  speech_autoplay: SpeechAutoplay | null;
  speech_rate: number | null;
}

export interface User {
  id: string;
  email: string;
  role: string;
  accountType: AccountType;
  emailVerifiedAt: string | null;
  displayName: string | null;
  language: string | null;
  twoFactorEnabled: boolean;
  speechEnabled: boolean;
  speechLang: string | null;
  speechAutoplay: SpeechAutoplay;
  speechRate: number;
}

export interface LibraryDeck {
  id: string;
  title: string;
  author: string;
  cardCount: number;
  publishedAt: string | null;
  categoryId: string | null;
}

export interface LibraryDeckDetail extends LibraryDeck {
  cards: { front: string; back: string; category: string | null }[];
}

export interface PublicDeckPreview {
  id: string;
  title: string;
  author: string;
  cardCount: number;
  publishedAt: string | null;
  cards: { front: string; category: string | null }[];
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  accountType: AccountType;
  emailVerifiedAt: string | null;
  createdAt: string;
}

export interface OfficialDeck {
  id: string;
  title: string;
  created_at: string;
  card_count: number;
  subscribed: boolean;
  category_id: string | null;
}

export interface DeckCollection {
  id: string;
  title: string;
  description: string | null;
  deck_count: number;
  category_id: string | null;
}

export interface DeckCollectionDetail {
  id: string;
  title: string;
  description: string | null;
  decks: OfficialDeck[];
}

/**
 * A node in the two-level category tree, shared by the App Decks and
 * Library browse pages. `id: "uncategorized"` is a synthetic entry (not a
 * real category row) for items with no category assigned; render its title
 * from local i18n rather than the server's placeholder text. `officialCount`
 * and `publicCount` are kept separate (not summed) so each page's badge
 * reflects only what it actually displays — App Decks shows officialCount,
 * Library shows publicCount.
 */
export interface DeckCategory {
  id: string;
  title: string;
  parentId: string | null;
  officialCount: number;
  publicCount: number;
  subcategories: DeckCategory[];
}

export interface DeckWithCounts extends DeckSpeech {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  card_count: number;
  due_count: number;
  is_public: boolean;
  // True for an official (app-owned) deck the caller has subscribed to.
  // Owner-only actions (rename/delete/share/speech) are hidden for these in
  // the UI since the mutation would silently no-op against the system owner.
  is_official: boolean;
  viewed_count: number;
  new_count: number;
  again_count: number;
  hard_count: number;
  good_count: number;
  easy_count: number;
  // True when the deck contains at least one `branch` card, i.e. it is a
  // decision-tree deck rather than a spaced-repetition deck. Branch cards carry
  // `{ label, prompt, options }` instead of `{ front, back }`, so web — which is
  // flip-only — cannot study them and must not offer to.
  is_branching: boolean;
}

// Raw stored content, as `GET /decks/:id` and `PATCH .../cards/:cardId` both
// return it: a branch card's display text is keyed `prompt`, not `front`.
export interface CardContent {
  front?: string;
  prompt?: string;
  back?: string;
  label?: string | null;
  options?: ParsedOption[];
  sense?: CardSense | null;
}

export interface Card {
  id: string;
  type: string;
  content: CardContent;
  category: string | null;
  position: number;
}

/** Fields a single-card edit may change — see decks.service.ts's cardPatchSchema. */
export interface CardEditPatch {
  front?: string;
  back?: string;
  category?: string | null;
  options?: ParsedOption[];
  sense?: { word?: string; context?: string | null; hint?: string | null };
}

export interface DeckSettings extends DeckSpeech {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  is_ordered: boolean;
}

export interface DeckDetail {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  cards: Card[];
}

export interface StudyCard {
  id: string;
  // `sense` is present only on cards that are one meaning of a word block (Spec 10);
  // every other card renders exactly as before.
  content: { front: string; back: string; sense?: CardSense | null };
  // Which phase to render a sense card in. Only the server sees every sense's
  // progress, so it decides; absent for ordinary cards.
  phase?: WordPhase;
  category: string | null;
  // The card's fixed place in the deck, independent of study order (the
  // scheduler studies cards out of sequence).
  position: number;
}

export interface ReviewResult {
  card_id: string;
  easiness: number;
  interval: number;
  repetitions: number;
  due_at: string;
}

export interface DeckStats {
  total: number;
  new: number;
  due: number;
  learned: number;
}

export interface ApiKey {
  name: string;
  key_prefix: string;
  created_at: string;
}

export interface CreatedApiKey extends ApiKey {
  key: string;
}
