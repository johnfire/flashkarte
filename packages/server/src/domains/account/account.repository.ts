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

export interface CardReadRow {
  card_id: string;
  read_at: string;
}

export function findCardReads(userId: string): Promise<CardReadRow[]> {
  return query<CardReadRow>(
    `SELECT card_id, read_at FROM card_reads WHERE user_id = $1 ORDER BY read_at`,
    [userId],
  );
}

export interface LessonModuleExportRow {
  id: string;
  subject_id: string;
  title: string;
  position: number;
}

export function findLessonModules(
  userId: string,
): Promise<LessonModuleExportRow[]> {
  return query<LessonModuleExportRow>(
    `SELECT m.id, m.subject_id, m.title, m.position
     FROM lesson_modules m JOIN subjects s ON s.id = m.subject_id
     WHERE s.user_id = $1 ORDER BY m.subject_id, m.position`,
    [userId],
  );
}

export interface LessonExportRow {
  subject_id: string;
  module_id: string | null;
  slug: string;
  title: string;
  summary: string;
  stage: string;
  position: number;
  covers: string[];
  prerequisites: { from: string; reason: string }[];
}

export function findLessons(userId: string): Promise<LessonExportRow[]> {
  return query<LessonExportRow>(
    `SELECT l.subject_id, l.module_id, l.slug, l.title, l.summary, l.stage, l.position,
            COALESCE((SELECT array_agg(c.slug ORDER BY c.position)
                      FROM lesson_concepts lc JOIN concepts c ON c.id = lc.concept_id
                      WHERE lc.lesson_id = l.id), '{}') AS covers,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('from', pl.slug, 'reason', p.reason))
                      FROM lesson_prerequisites p JOIN lessons pl ON pl.id = p.from_lesson
                      WHERE p.to_lesson = l.id), '[]'::jsonb) AS prerequisites
     FROM lessons l JOIN subjects s ON s.id = l.subject_id
     WHERE s.user_id = $1 ORDER BY l.subject_id, l.position`,
    [userId],
  );
}

export interface ScreenExportRow {
  subject_id: string;
  lesson_slug: string;
  number: string;
  blocks: unknown;
  author_kind: string;
  sources: unknown;
  retired_at: string | null;
  revisions: { change: string; changed_at: string; blocks: unknown }[];
}

export function findScreens(userId: string): Promise<ScreenExportRow[]> {
  return query<ScreenExportRow>(
    `SELECT sc.subject_id, l.slug AS lesson_slug, sc.number::text AS number, sc.blocks,
            sc.author_kind, sc.sources, sc.retired_at,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('change', r.change, 'changed_at', r.changed_at, 'blocks', r.blocks)
                                       ORDER BY r.changed_at)
                      FROM screen_revisions r WHERE r.screen_id = sc.id), '[]'::jsonb) AS revisions
     FROM screens sc
     JOIN lessons l ON l.id = sc.lesson_id
     JOIN subjects s ON s.id = sc.subject_id
     WHERE s.user_id = $1 ORDER BY sc.subject_id, sc.number`,
    [userId],
  );
}

export interface LessonQuestionExportRow {
  subject_id: string;
  lesson_slug: string;
  id: string;
  parent_id: string | null;
  prompt: unknown;
  options: unknown;
  retired_at: string | null;
  teaches: string[];
  covers: string[];
}

export function findLessonQuestions(
  userId: string,
): Promise<LessonQuestionExportRow[]> {
  return query<LessonQuestionExportRow>(
    `SELECT l.subject_id, l.slug AS lesson_slug, q.id, q.parent_id, q.prompt, q.options, q.retired_at,
            COALESCE((SELECT array_agg(sc.number::text ORDER BY sc.number)
                      FROM question_screens qs JOIN screens sc ON sc.id = qs.screen_id
                      WHERE qs.question_id = q.id), '{}') AS teaches,
            COALESCE((SELECT array_agg(c.slug ORDER BY c.position)
                      FROM question_concepts qc JOIN concepts c ON c.id = qc.concept_id
                      WHERE qc.question_id = q.id), '{}') AS covers
     FROM lesson_questions q
     JOIN lessons l ON l.id = q.lesson_id
     JOIN subjects s ON s.id = l.subject_id
     WHERE s.user_id = $1 ORDER BY l.subject_id, l.position, q.position`,
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

/**
 * Atomically consume one backup-code hash. The predicate requires the hash to
 * still be present, and Postgres re-checks it after waiting on a concurrent
 * update of the row, so of two requests racing on the same code exactly one
 * gets `true`. array_remove works on the current row value, so concurrent use
 * of different codes can't overwrite each other's removals.
 */
export async function consumeTwoFactorBackup(
  userId: string,
  backupHash: string,
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `UPDATE users
        SET two_factor_backup = array_remove(two_factor_backup, $2),
            updated_at = now()
      WHERE id = $1 AND two_factor_enabled AND $2 = ANY(two_factor_backup)
      RETURNING id`,
    [userId, backupHash],
  );
  return rows.length === 1;
}

export interface LessonProgressExportRow {
  subject_id: string;
  lesson_slug: string;
  status: string;
  session: unknown;
  started_at: string;
  updated_at: string;
  passed_at: string | null;
}

/** The learner's place in each lesson, including the saved session (which screen, misses so far). */
export function findLessonProgress(
  userId: string,
): Promise<LessonProgressExportRow[]> {
  return query<LessonProgressExportRow>(
    `SELECT l.subject_id, l.slug AS lesson_slug, p.status, p.session, p.started_at, p.updated_at, p.passed_at
     FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
     WHERE p.user_id = $1 ORDER BY p.started_at`,
    [userId],
  );
}

export interface QuestionAttemptExportRow {
  question_id: string;
  presentation_id: string;
  chosen_option: number;
  correct: boolean;
  phase: string;
  misses: number;
  attempted_at: string;
}

export function findQuestionAttempts(
  userId: string,
): Promise<QuestionAttemptExportRow[]> {
  return query<QuestionAttemptExportRow>(
    `SELECT question_id, presentation_id, chosen_option, correct, phase, misses, attempted_at
     FROM question_attempts WHERE user_id = $1 ORDER BY attempted_at`,
    [userId],
  );
}

export interface QuestionReviewExportRow {
  question_id: string;
  easiness: number;
  interval_days: number;
  repetitions: number;
  last_rating: number | null;
  due_at: string;
  last_reviewed_at: string | null;
}

export function findQuestionReviews(
  userId: string,
): Promise<QuestionReviewExportRow[]> {
  return query<QuestionReviewExportRow>(
    `SELECT question_id, easiness, interval_days, repetitions, last_rating, due_at, last_reviewed_at
     FROM question_reviews WHERE user_id = $1 ORDER BY due_at`,
    [userId],
  );
}

export interface ScreenCommentExportRow {
  subject_id: string;
  number: string;
  kind: string;
  selection: string | null;
  body: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export function findScreenComments(
  userId: string,
): Promise<ScreenCommentExportRow[]> {
  return query<ScreenCommentExportRow>(
    `SELECT s.subject_id, s.number::text AS number, c.kind, c.selection, c.body, c.created_at, c.resolved_at, c.resolved_by
     FROM screen_comments c JOIN screens s ON s.id = c.screen_id
     WHERE c.user_id = $1 ORDER BY c.created_at`,
    [userId],
  );
}

export interface AssetExportRow {
  id: string;
  subject_id: string;
  kind: string;
  description: string | null;
  author_kind: string;
  content: string;
  latex: string | null;
  created_at: string;
}

/** The subject's stored images, with their SVG, since they are part of the lessons the owner wrote. */
export function findAssets(userId: string): Promise<AssetExportRow[]> {
  return query<AssetExportRow>(
    `SELECT a.id, a.subject_id, a.kind, a.description, a.author_kind, a.content, a.latex, a.created_at
     FROM assets a JOIN subjects s ON s.id = a.subject_id
     WHERE s.user_id = $1 ORDER BY a.created_at, a.id`,
    [userId],
  );
}
