import { query, queryOne } from "../../db/client";

export interface ProfileRow {
  email: string;
  display_name: string | null;
  role: string;
  account_type: string;
  language: string | null;
  email_verified_at: string | null;
  created_at: string;
}

export interface DeckRow {
  id: string;
  title: string;
  source_filename: string | null;
  is_public: boolean;
  is_ordered: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardRow {
  id: string;
  deck_id: string;
  type: string;
  content: unknown;
  category: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProgressRow {
  card_id: string;
  repetitions: number;
  ease_factor: number;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string | null;
  last_rating: number | null;
}

export interface ReviewEventRow {
  event_id: string;
  card_id: string;
  rating: number;
  reviewed_at: string;
  option_index: number | null;
  created_at: string;
}

export interface ApiKeyMetaRow {
  name: string;
  key_prefix: string;
  scope: string;
  created_at: string;
}

export function findProfile(userId: string): Promise<ProfileRow | null> {
  return queryOne<ProfileRow>(
    `SELECT email, display_name, role, account_type, language,
            email_verified_at, created_at
       FROM users WHERE id = $1`,
    [userId],
  );
}

export function findDecks(userId: string): Promise<DeckRow[]> {
  return query<DeckRow>(
    `SELECT id, title, source_filename, is_public, is_ordered,
            created_at, updated_at
       FROM decks WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
}

export function findCards(userId: string): Promise<CardRow[]> {
  return query<CardRow>(
    `SELECT id, deck_id, type, content, category, position,
            created_at, updated_at
       FROM cards WHERE user_id = $1 ORDER BY deck_id, position`,
    [userId],
  );
}

export function findProgress(userId: string): Promise<ProgressRow[]> {
  return query<ProgressRow>(
    `SELECT card_id, repetitions, ease_factor, interval_days, due_at,
            last_reviewed_at, last_rating
       FROM card_progress WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
}

export function findReviewEvents(userId: string): Promise<ReviewEventRow[]> {
  return query<ReviewEventRow>(
    `SELECT event_id, card_id, rating, reviewed_at, option_index, created_at
       FROM review_events WHERE user_id = $1 ORDER BY reviewed_at`,
    [userId],
  );
}

/** Key metadata only — the hash is a credential and must never be exported. */
export function findApiKeyMeta(userId: string): Promise<ApiKeyMetaRow[]> {
  return query<ApiKeyMetaRow>(
    `SELECT name, key_prefix, scope, created_at
       FROM user_api_keys WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
}
