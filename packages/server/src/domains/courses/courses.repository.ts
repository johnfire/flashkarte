import { getPool, query, queryOne, withTransaction } from "../../db/client";
import type { Queryable } from "../../db/queryable";

export interface CourseRow {
  id: string;
  reference_number: number;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  content_language: string | null;
  created_at: string;
  updated_at: string;
  // Someone else's course, shared with the caller (school/teacher/class).
  is_shared?: boolean;
  // The caller added that shared course to their courses.
  subscribed?: boolean;
}

const COURSE_COLS =
  "id, reference_number, user_id, title, description, is_public, content_language, created_at, updated_at";

export function createCourse(
  userId: string,
  title: string,
  description: string | null,
  contentLanguage: string | null = null,
  db: Queryable = getPool(),
) {
  return db
    .query<CourseRow>(
      `INSERT INTO courses (user_id, title, description, content_language)
     VALUES ($1, $2, $3, $4)
     RETURNING ${COURSE_COLS}`,
      [userId, title, description, contentLanguage],
    )
    .then((result) => result.rows[0] ?? null);
}

// An added course someone shared with the caller, still shared with them.
// Checked live: leaving the class or school drops it at once.
const ADDED_SHARED = `(EXISTS (
    SELECT 1 FROM course_subscriptions cs
    WHERE cs.course_id = courses.id AND cs.user_id = $1
  ) AND course_shared_with(courses.id, $1::uuid))`;

/** The caller's own courses plus shared courses they added. */
export function listCourses(userId: string) {
  return query<CourseRow>(
    `SELECT ${COURSE_COLS}, (user_id <> $1) AS is_shared FROM courses
     WHERE user_id = $1 OR ${ADDED_SHARED}
     ORDER BY created_at DESC`,
    [userId],
  );
}

/**
 * Readable by the owner, by anyone it is shared with, or, for browsing
 * before a clone, anyone if public.
 */
export function getCourse(userId: string, id: string) {
  return queryOne<CourseRow>(
    `SELECT ${COURSE_COLS}, (user_id <> $2) AS is_shared,
       EXISTS (
         SELECT 1 FROM course_subscriptions cs
         WHERE cs.course_id = courses.id AND cs.user_id = $2
       ) AS subscribed
     FROM courses
     WHERE id = $1
       AND (user_id = $2 OR is_public OR course_shared_with(id, $2::uuid))`,
    [id, userId],
  );
}

export interface SharedCourseRow {
  id: string;
  reference_number: number;
  title: string;
  description: string | null;
  content_language: string | null;
  decks_total: number;
  author: string | null;
  subscribed: boolean;
  scopes: ("school" | "class" | "teacher_students")[];
}

/** Courses others shared with the caller through a school, class or teacher. */
export function listSharedWithUser(userId: string) {
  return query<SharedCourseRow>(
    `SELECT c.id, c.reference_number, c.title, c.description, c.content_language,
       (SELECT count(*) FROM course_decks cd WHERE cd.course_id = c.id)::int AS decks_total,
       -- Never the email: a pupil sees a display name or nothing.
       NULLIF(trim(u.display_name), '') AS author,
       EXISTS (
         SELECT 1 FROM course_subscriptions cs
         WHERE cs.course_id = c.id AND cs.user_id = $1
       ) AS subscribed,
       ARRAY(SELECT DISTINCT s.scope FROM course_shares s WHERE s.course_id = c.id) AS scopes
     FROM courses c JOIN users u ON u.id = c.user_id
     WHERE c.user_id <> $1 AND course_shared_with(c.id, $1::uuid)
     ORDER BY c.title COLLATE de_phonebook ASC`,
    [userId],
  );
}

export function isSharedWith(userId: string, courseId: string) {
  return queryOne<{ shared: boolean }>(
    `SELECT course_shared_with($1::uuid, $2::uuid) AS shared
     FROM courses WHERE id = $1 AND user_id <> $2`,
    [courseId, userId],
  );
}

export async function isSubscribed(userId: string, courseId: string) {
  const row = await queryOne<{ course_id: string }>(
    "SELECT course_id FROM course_subscriptions WHERE user_id = $1 AND course_id = $2",
    [userId, courseId],
  );
  return row !== null;
}

export async function subscribe(
  userId: string,
  courseId: string,
  db: Queryable,
) {
  await db.query(
    `INSERT INTO course_subscriptions (user_id, course_id) VALUES ($1, $2)
     ON CONFLICT (user_id, course_id) DO NOTHING`,
    [userId, courseId],
  );
}

export async function unsubscribe(userId: string, courseId: string) {
  await query(
    "DELETE FROM course_subscriptions WHERE user_id = $1 AND course_id = $2",
    [userId, courseId],
  );
}

/** Owner-only: every mutation (edit, reorder, delete, add/remove a deck)
 *  goes through this, so a public course stays browsable but not editable
 *  by anyone but its owner. */
export function getOwnedCourse(userId: string, id: string) {
  return queryOne<CourseRow>(
    `SELECT ${COURSE_COLS} FROM courses WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

/** Writes a fully-resolved next state -- the service layer merges the patch
 *  onto the current row first, mirroring decks.service's applyCardPatch. */
export function updateCourseRow(
  id: string,
  next: {
    title: string;
    description: string | null;
    is_public: boolean;
    content_language: string | null;
  },
) {
  return queryOne<CourseRow>(
    `UPDATE courses SET title = $2, description = $3, is_public = $4, content_language = $5, updated_at = now()
     WHERE id = $1
     RETURNING ${COURSE_COLS}`,
    [id, next.title, next.description, next.is_public, next.content_language],
  );
}

export async function deleteCourse(id: string) {
  await query(`DELETE FROM courses WHERE id = $1`, [id]);
}

export interface CourseDeckRow {
  deck_id: string;
  position: number;
  title: string;
  card_count: number;
  mastered_count: number;
}

/**
 * One deck row per course member, in position order, with the card counts
 * gating needs. `stableReps` is bound from the caller (packages/shared's
 * STABLE_REPS) rather than hardcoded, so course gating can never silently
 * drift from the same threshold Spec 10's polysemy phase gating uses.
 */
export function getCourseDecks(
  userId: string,
  courseId: string,
  stableReps: number,
) {
  return query<CourseDeckRow>(
    `SELECT cd.deck_id, cd.position, d.title,
            count(c.id)::int AS card_count,
            count(c.id) FILTER (WHERE p.repetitions >= $3)::int AS mastered_count
     FROM course_decks cd
     JOIN decks d ON d.id = cd.deck_id
     -- A reading card has no SR state, so it can never become 'mastered'; counting
     -- it would lock every later deck in the course forever.
     LEFT JOIN cards c ON c.deck_id = d.id AND c.type <> 'read'
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE cd.course_id = $2
     GROUP BY cd.deck_id, cd.position, d.title
     ORDER BY cd.position ASC`,
    [userId, courseId, stableReps],
  );
}

export interface PublicCourseRow extends CourseRow {
  decks_total: number;
}

export function listPublicCourses(
  limit: number,
  offset: number,
  language?: string,
) {
  return query<PublicCourseRow>(
    `SELECT c.*,
            (SELECT count(*) FROM course_decks cd WHERE cd.course_id = c.id)::int AS decks_total
     FROM courses c
     WHERE c.is_public AND ($3::text IS NULL OR c.content_language = $3)
     ORDER BY c.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset, language ?? null],
  );
}

export interface PublicCourseDeckRow {
  deck_id: string;
  position: number;
  title: string;
  card_count: number;
  content_language: string | null;
}

/** Ordered member decks of a course, with no progress/gating -- for
 *  browsing before a clone, where the caller doesn't own any of it yet. */
export function getPublicCourseDecks(courseId: string) {
  return query<PublicCourseDeckRow>(
    `SELECT cd.deck_id, cd.position, d.title, d.content_language,
            (SELECT count(*) FROM cards c WHERE c.deck_id = d.id)::int AS card_count
     FROM course_decks cd
     JOIN decks d ON d.id = cd.deck_id
     JOIN courses co ON co.id = cd.course_id
     WHERE cd.course_id = $1 AND co.is_public
     ORDER BY cd.position ASC`,
    [courseId],
  );
}

/**
 * Every card of a deck, with no ownership/public filter -- safe ONLY because
 * the sole caller (courses.service's cloneCourse) has already verified the
 * owning course is public before reading any deck's cards this way.
 */
export function getCardsForDeck(deckId: string, db: Queryable = getPool()) {
  return db
    .query<{
      type: string;
      content: Record<string, unknown>;
      category: string | null;
      position: number;
    }>(
      `SELECT c.type, c.content, c.category, c.position
     FROM cards c WHERE c.deck_id = $1 ORDER BY c.position ASC`,
      [deckId],
    )
    .then((result) => result.rows);
}

export function deckBelongsToUser(userId: string, deckId: string) {
  return queryOne<{ id: string }>(
    `SELECT id FROM decks WHERE id = $1 AND user_id = $2`,
    [deckId, userId],
  );
}

export function isDeckInCourse(courseId: string, deckId: string) {
  return queryOne<{ deck_id: string }>(
    `SELECT deck_id FROM course_decks WHERE course_id = $1 AND deck_id = $2`,
    [courseId, deckId],
  );
}

export async function addDeckToCourse(
  courseId: string,
  deckId: string,
  db?: Queryable,
) {
  const add = async (client: Queryable) => {
    const rows = await client.query<{ next: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next FROM course_decks WHERE course_id = $1`,
      [courseId],
    );
    const position = rows.rows[0].next;
    await client.query(
      `INSERT INTO course_decks (course_id, deck_id, position) VALUES ($1, $2, $3)`,
      [courseId, deckId, position],
    );
  };
  await (db ? add(db) : withTransaction(add));
}

export async function removeDeckFromCourse(courseId: string, deckId: string) {
  await query(
    `DELETE FROM course_decks WHERE course_id = $1 AND deck_id = $2`,
    [courseId, deckId],
  );
}

/**
 * Atomic rewrite of every member's position. Deferred inside one transaction
 * (see the migration's DEFERRABLE constraint) so a row-by-row UPDATE doesn't
 * collide against a sibling that hasn't moved yet.
 */
export async function reorderCourseDecks(
  courseId: string,
  orderedDeckIds: string[],
) {
  await withTransaction(async (client) => {
    await client.query("SET CONSTRAINTS course_decks_position_unique DEFERRED");
    for (const [index, deckId] of orderedDeckIds.entries()) {
      await client.query(
        `UPDATE course_decks SET position = $1 WHERE course_id = $2 AND deck_id = $3`,
        [index, courseId, deckId],
      );
    }
  });
}
