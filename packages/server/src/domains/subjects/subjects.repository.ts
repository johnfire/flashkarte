import { getPool, query } from "../../db/client";
import type { Queryable } from "../../db/queryable";

export interface SubjectRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

const SUBJECT_COLS =
  "id, user_id, title, description, is_public, version, created_at, updated_at";

export async function insertSubject(
  db: Queryable,
  userId: string,
  title: string,
  description: string | null,
): Promise<SubjectRow> {
  const result = await db.query<SubjectRow>(
    `INSERT INTO subjects (user_id, title, description)
     VALUES ($1, $2, $3)
     RETURNING ${SUBJECT_COLS}`,
    [userId, title, description],
  );
  return result.rows[0];
}

export interface SubjectSummaryRow extends SubjectRow {
  concept_count: number;
}

export function listSubjects(userId: string) {
  return query<SubjectSummaryRow>(
    `SELECT s.*,
            (SELECT count(*) FROM concepts c WHERE c.subject_id = s.id)::int AS concept_count
     FROM subjects s
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC`,
    [userId],
  );
}

/** Owner-only: every read and write of a subject goes through this. */
export async function findOwnedSubject(
  userId: string,
  id: string,
  db: Queryable = getPool(),
): Promise<SubjectRow | null> {
  const result = await db.query<SubjectRow>(
    `SELECT ${SUBJECT_COLS} FROM subjects WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return result.rows[0] ?? null;
}

/**
 * Same as findOwnedSubject but takes a row lock, so two concurrent graph edits
 * on one subject run one after the other. Without it, two edges that are each
 * acyclic alone could together close a cycle.
 */
export async function lockOwnedSubject(
  db: Queryable,
  userId: string,
  id: string,
): Promise<SubjectRow | null> {
  const result = await db.query<SubjectRow>(
    `SELECT ${SUBJECT_COLS} FROM subjects WHERE id = $1 AND user_id = $2 FOR UPDATE`,
    [id, userId],
  );
  return result.rows[0] ?? null;
}

export async function writeSubject(
  id: string,
  next: { title: string; description: string | null; is_public: boolean },
): Promise<SubjectRow | null> {
  const result = await getPool().query<SubjectRow>(
    `UPDATE subjects SET title = $2, description = $3, is_public = $4, updated_at = now()
     WHERE id = $1
     RETURNING ${SUBJECT_COLS}`,
    [id, next.title, next.description, next.is_public],
  );
  return result.rows[0] ?? null;
}

export async function removeSubject(id: string): Promise<void> {
  await query(`DELETE FROM subjects WHERE id = $1`, [id]);
}

export async function bumpSubjectVersion(
  db: Queryable,
  subjectId: string,
): Promise<void> {
  await db.query(
    `UPDATE subjects SET version = version + 1, updated_at = now() WHERE id = $1`,
    [subjectId],
  );
}
