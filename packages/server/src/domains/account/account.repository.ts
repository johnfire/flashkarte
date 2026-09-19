import { query, queryOne } from "../../db/client";

export interface ProfileRow {
  email: string;
  display_name: string | null;
  role: string;
  account_type: string;
  language: string | null;
  speech_enabled: boolean;
  speech_lang: string | null;
  speech_autoplay: string;
  speech_rate: number;
  email_verified_at: string | null;
  created_at: string;
}

export interface DeckRow {
  id: string;
  title: string;
  source_filename: string | null;
  is_public: boolean;
  is_ordered: boolean;
  speech_enabled: boolean | null;
  speech_front_lang: string | null;
  speech_back_lang: string | null;
  speech_autoplay: string | null;
  speech_rate: number | null;
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
            speech_enabled, speech_lang, speech_autoplay, speech_rate,
            email_verified_at, created_at
       FROM users WHERE id = $1`,
    [userId],
  );
}

export function findDecks(userId: string): Promise<DeckRow[]> {
  return query<DeckRow>(
    `SELECT id, title, source_filename, is_public, is_ordered,
            speech_enabled, speech_front_lang, speech_back_lang, speech_autoplay, speech_rate,
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

export interface SubjectExportRow {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export function findSubjects(userId: string): Promise<SubjectExportRow[]> {
  return query<SubjectExportRow>(
    `SELECT id, title, description, is_public, version, created_at, updated_at
     FROM subjects WHERE user_id = $1 ORDER BY created_at`,
    [userId],
  );
}

export interface ConceptExportRow {
  subject_id: string;
  slug: string;
  name: string;
  kind: string;
  tier: string;
  position: number;
  card_ids: string[];
}

export function findConcepts(userId: string): Promise<ConceptExportRow[]> {
  return query<ConceptExportRow>(
    `SELECT c.subject_id, c.slug, c.name, c.kind, c.tier, c.position,
            COALESCE(array_agg(cc.card_id) FILTER (WHERE cc.card_id IS NOT NULL), '{}') AS card_ids
     FROM concepts c
     JOIN subjects s ON s.id = c.subject_id
     LEFT JOIN card_concepts cc ON cc.concept_id = c.id
     WHERE s.user_id = $1
     GROUP BY c.id
     ORDER BY c.subject_id, c.position`,
    [userId],
  );
}

export interface ConceptEdgeExportRow {
  subject_id: string;
  from_slug: string;
  to_slug: string;
  strength: string;
  reason: string | null;
}

export function findConceptEdges(
  userId: string,
): Promise<ConceptEdgeExportRow[]> {
  return query<ConceptEdgeExportRow>(
    `SELECT t.subject_id, f.slug AS from_slug, t.slug AS to_slug, e.strength, e.reason
     FROM concept_edges e
     JOIN concepts f ON f.id = e.from_concept
     JOIN concepts t ON t.id = e.to_concept
     JOIN subjects s ON s.id = t.subject_id
     WHERE s.user_id = $1
     ORDER BY t.subject_id, t.position`,
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

// --- Two-factor auth (§13.1) ---

export interface TwoFactorRow {
  email: string;
  two_factor_secret_enc: string | null;
  two_factor_enabled: boolean;
  two_factor_backup: string[];
}

export function findTwoFactor(userId: string): Promise<TwoFactorRow | null> {
  return queryOne<TwoFactorRow>(
    `SELECT email, two_factor_secret_enc, two_factor_enabled, two_factor_backup
       FROM users WHERE id = $1`,
    [userId],
  );
}

/** Store a (not yet verified) encrypted TOTP seed during setup. */
export function setTwoFactorSecret(
  userId: string,
  encryptedSecret: string,
): Promise<unknown[]> {
  return query(
    `UPDATE users SET two_factor_secret_enc = $2, updated_at = now()
      WHERE id = $1 AND two_factor_enabled = false`,
    [userId, encryptedSecret],
  );
}

export function enableTwoFactor(
  userId: string,
  backupHashes: string[],
): Promise<unknown[]> {
  return query(
    `UPDATE users SET two_factor_enabled = true, two_factor_backup = $2,
            updated_at = now()
      WHERE id = $1`,
    [userId, backupHashes],
  );
}

export function disableTwoFactor(userId: string): Promise<unknown[]> {
  return query(
    `UPDATE users SET two_factor_enabled = false, two_factor_secret_enc = NULL,
            two_factor_backup = '{}', updated_at = now()
      WHERE id = $1`,
    [userId],
  );
}

/** Replace the backup-code hashes (used to consume a spent code). */
export function updateTwoFactorBackup(
  userId: string,
  backupHashes: string[],
): Promise<unknown[]> {
  return query(
    `UPDATE users SET two_factor_backup = $2, updated_at = now()
      WHERE id = $1`,
    [userId, backupHashes],
  );
}
