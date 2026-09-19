import type { Queryable } from "../../db/queryable";

export type LessonStage = "testing" | "finished";

export interface ModuleRow {
  id: string;
  subject_id: string;
  title: string;
  position: number;
}

export interface LessonRow {
  id: string;
  subject_id: string;
  module_id: string | null;
  slug: string;
  title: string;
  summary: string;
  stage: LessonStage;
  position: number;
}

export interface PrerequisiteRow {
  from_lesson: string;
  to_lesson: string;
  reason: string;
}

const LESSON_COLS =
  "id, subject_id, module_id, slug, title, summary, stage, position";

export async function insertModule(
  db: Queryable,
  subjectId: string,
  title: string,
): Promise<ModuleRow> {
  const result = await db.query<ModuleRow>(
    `INSERT INTO lesson_modules (subject_id, title, position)
     VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM lesson_modules WHERE subject_id = $1))
     RETURNING id, subject_id, title, position`,
    [subjectId, title],
  );
  return result.rows[0];
}

export async function listModules(
  db: Queryable,
  subjectId: string,
): Promise<ModuleRow[]> {
  const result = await db.query<ModuleRow>(
    `SELECT id, subject_id, title, position FROM lesson_modules
     WHERE subject_id = $1 ORDER BY position ASC`,
    [subjectId],
  );
  return result.rows;
}

export async function findModule(
  db: Queryable,
  subjectId: string,
  id: string,
): Promise<ModuleRow | null> {
  const result = await db.query<ModuleRow>(
    `SELECT id, subject_id, title, position FROM lesson_modules WHERE subject_id = $1 AND id = $2`,
    [subjectId, id],
  );
  return result.rows[0] ?? null;
}

export async function writeModule(
  db: Queryable,
  id: string,
  next: { title: string; position: number },
): Promise<ModuleRow> {
  const result = await db.query<ModuleRow>(
    `UPDATE lesson_modules SET title = $2, position = $3 WHERE id = $1
     RETURNING id, subject_id, title, position`,
    [id, next.title, next.position],
  );
  return result.rows[0];
}

export async function removeModule(db: Queryable, id: string): Promise<void> {
  await db.query(`DELETE FROM lesson_modules WHERE id = $1`, [id]);
}

export async function insertLesson(
  db: Queryable,
  subjectId: string,
  fields: {
    slug: string;
    title: string;
    summary: string;
    moduleId: string | null;
  },
): Promise<LessonRow> {
  const result = await db.query<LessonRow>(
    `INSERT INTO lessons (subject_id, module_id, slug, title, summary, position)
     VALUES ($1, $2, $3, $4, $5,
             (SELECT COALESCE(MAX(position), -1) + 1 FROM lessons WHERE subject_id = $1))
     RETURNING ${LESSON_COLS}`,
    [subjectId, fields.moduleId, fields.slug, fields.title, fields.summary],
  );
  return result.rows[0];
}

export async function findLessonById(
  db: Queryable,
  id: string,
): Promise<LessonRow | null> {
  const result = await db.query<LessonRow>(
    `SELECT ${LESSON_COLS} FROM lessons WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listLessons(
  db: Queryable,
  subjectId: string,
): Promise<LessonRow[]> {
  const result = await db.query<LessonRow>(
    `SELECT ${LESSON_COLS} FROM lessons WHERE subject_id = $1 ORDER BY position ASC`,
    [subjectId],
  );
  return result.rows;
}

export async function findLessonBySlug(
  db: Queryable,
  subjectId: string,
  slug: string,
): Promise<LessonRow | null> {
  const result = await db.query<LessonRow>(
    `SELECT ${LESSON_COLS} FROM lessons WHERE subject_id = $1 AND slug = $2`,
    [subjectId, slug],
  );
  return result.rows[0] ?? null;
}

export async function writeLesson(
  db: Queryable,
  id: string,
  next: { title: string; summary: string; moduleId: string | null },
): Promise<LessonRow> {
  const result = await db.query<LessonRow>(
    `UPDATE lessons SET title = $2, summary = $3, module_id = $4, updated_at = now()
     WHERE id = $1 RETURNING ${LESSON_COLS}`,
    [id, next.title, next.summary, next.moduleId],
  );
  return result.rows[0];
}

export async function writeStage(
  db: Queryable,
  id: string,
  stage: LessonStage,
): Promise<void> {
  await db.query(
    `UPDATE lessons SET stage = $2, updated_at = now() WHERE id = $1`,
    [id, stage],
  );
}

export async function removeLesson(db: Queryable, id: string): Promise<void> {
  await db.query(`DELETE FROM lessons WHERE id = $1`, [id]);
}

/** Replaces the lesson's coverage checklist. */
export async function replaceLessonConcepts(
  db: Queryable,
  lessonId: string,
  conceptIds: string[],
): Promise<void> {
  await db.query(`DELETE FROM lesson_concepts WHERE lesson_id = $1`, [
    lessonId,
  ]);
  if (conceptIds.length === 0) return;
  await db.query(
    `INSERT INTO lesson_concepts (lesson_id, concept_id)
     SELECT $1, concept_id FROM unnest($2::uuid[]) AS concept_id`,
    [lessonId, conceptIds],
  );
}

export interface LessonConceptRow {
  lesson_id: string;
  slug: string;
  name: string;
}

/** Every lesson's covered concepts across the subject, in the concepts' authoring order. */
export async function listLessonConcepts(
  db: Queryable,
  subjectId: string,
): Promise<LessonConceptRow[]> {
  const result = await db.query<LessonConceptRow>(
    `SELECT lc.lesson_id, c.slug, c.name
     FROM lesson_concepts lc
     JOIN concepts c ON c.id = lc.concept_id
     JOIN lessons l ON l.id = lc.lesson_id
     WHERE l.subject_id = $1
     ORDER BY c.position ASC`,
    [subjectId],
  );
  return result.rows;
}

export async function upsertPrerequisite(
  db: Queryable,
  row: PrerequisiteRow,
): Promise<void> {
  await db.query(
    `INSERT INTO lesson_prerequisites (from_lesson, to_lesson, reason)
     VALUES ($1, $2, $3)
     ON CONFLICT (from_lesson, to_lesson) DO UPDATE SET reason = EXCLUDED.reason`,
    [row.from_lesson, row.to_lesson, row.reason],
  );
}

export async function removePrerequisite(
  db: Queryable,
  fromLesson: string,
  toLesson: string,
): Promise<boolean> {
  const result = await db.query(
    `DELETE FROM lesson_prerequisites WHERE from_lesson = $1 AND to_lesson = $2`,
    [fromLesson, toLesson],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listPrerequisites(
  db: Queryable,
  subjectId: string,
): Promise<PrerequisiteRow[]> {
  const result = await db.query<PrerequisiteRow>(
    `SELECT p.from_lesson, p.to_lesson, p.reason
     FROM lesson_prerequisites p
     JOIN lessons l ON l.id = p.to_lesson
     WHERE l.subject_id = $1
     ORDER BY l.position ASC, p.created_at ASC`,
    [subjectId],
  );
  return result.rows;
}
