import type { SpeechAutoplay } from "@flashkarte/shared";

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

export interface DeckWithCounts extends DeckSpeech {
  id: string;
  title: string;
  source_filename: string | null;
  created_at: string;
  updated_at: string;
  card_count: number;
  due_count: number;
  is_public: boolean;
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

export interface Card {
  id: string;
  type: string;
  content: { front: string; back: string };
  category: string | null;
  position: number;
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
  content: { front: string; back: string };
  category: string | null;
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
