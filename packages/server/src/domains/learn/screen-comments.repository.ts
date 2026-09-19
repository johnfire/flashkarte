import type { Queryable } from "../../db/queryable";

export interface ScreenCommentRow {
  id: string;
  number: string;
  body: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

const COMMENT_COLS = `c.id, s.number::text AS number, c.body, c.created_at, c.resolved_at, c.resolved_by`;

export async function insertComment(
  db: Queryable,
  userId: string,
  screenId: string,
  body: string,
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO screen_comments (user_id, screen_id, body) VALUES ($1, $2, $3) RETURNING id`,
    [userId, screenId, body],
  );
  return result.rows[0].id;
}

/** A lesson's comments in screen order, then oldest first. Only the open ones unless asked. */
export async function listLessonComments(
  db: Queryable,
  lessonId: string,
  includeResolved: boolean,
): Promise<ScreenCommentRow[]> {
  const result = await db.query<ScreenCommentRow>(
    `SELECT ${COMMENT_COLS}
     FROM screen_comments c JOIN screens s ON s.id = c.screen_id
     WHERE s.lesson_id = $1 AND ($2 OR c.resolved_at IS NULL)
     ORDER BY s.number, c.created_at`,
    [lessonId, includeResolved],
  );
  return result.rows;
}

/** Marks one comment of this subject resolved. Returns false if it does not exist or was already resolved. */
export async function resolveComment(
  db: Queryable,
  subjectId: string,
  commentId: string,
  resolvedBy: "human" | "ai",
): Promise<boolean> {
  const result = await db.query(
    `UPDATE screen_comments c SET resolved_at = now(), resolved_by = $3
     FROM screens s
     WHERE c.id = $2 AND s.id = c.screen_id AND s.subject_id = $1 AND c.resolved_at IS NULL`,
    [subjectId, commentId, resolvedBy],
  );
  return (result.rowCount ?? 0) > 0;
}
