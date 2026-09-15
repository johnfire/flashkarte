import { query, queryOne, withTransaction } from "../../db/client";

export interface CourseRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

const COURSE_COLS =
  "id, user_id, title, description, is_public, created_at, updated_at";

export function createCourse(
  userId: string,
  title: string,
  description: string | null,
) {
  return queryOne<CourseRow>(
    `INSERT INTO courses (user_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING ${COURSE_COLS}`,
    [userId, title, description],
  );
}

export function listCourses(userId: string) {
  return query<CourseRow>(
    `SELECT ${COURSE_COLS} FROM courses WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
}

/** Readable by the owner or, for browsing before a clone, anyone if public. */
export function getCourse(userId: string, id: string) {
  return queryOne<CourseRow>(
    `SELECT ${COURSE_COLS} FROM courses WHERE id = $1 AND (user_id = $2 OR is_public)`,
    [id, userId],
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
  next: { title: string; description: string | null; is_public: boolean },
) {
  return queryOne<CourseRow>(
    `UPDATE courses SET title = $2, description = $3, is_public = $4, updated_at = now()
     WHERE id = $1
     RETURNING ${COURSE_COLS}`,
    [id, next.title, next.description, next.is_public],
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
     LEFT JOIN cards c ON c.deck_id = d.id
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE cd.course_id = $2
     GROUP BY cd.deck_id, cd.position, d.title
     ORDER BY cd.position ASC`,
    [userId, courseId, stableReps],
  );
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

export async function addDeckToCourse(courseId: string, deckId: string) {
  await withTransaction(async (client) => {
    const rows = await client.query<{ next: number }>(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next FROM course_decks WHERE course_id = $1`,
      [courseId],
    );
    const position = rows.rows[0].next;
    await client.query(
      `INSERT INTO course_decks (course_id, deck_id, position) VALUES ($1, $2, $3)`,
      [courseId, deckId, position],
    );
  });
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
