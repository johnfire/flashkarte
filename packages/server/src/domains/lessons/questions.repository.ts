import { normalizeScreenNumber } from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";

export interface QuestionOptionJson {
  correct: boolean;
  blocks: unknown;
  reason: unknown;
}

export interface QuestionRow {
  id: string;
  lesson_id: string;
  parent_id: string | null;
  position: number;
  prompt: unknown;
  options: QuestionOptionJson[];
  retired_at: string | null;
}

const QUESTION_COLS =
  "id, lesson_id, parent_id, position, prompt, options, retired_at";

export async function insertQuestion(
  db: Queryable,
  fields: {
    lessonId: string;
    parentId: string | null;
    prompt: unknown;
    options: unknown;
  },
): Promise<QuestionRow> {
  const result = await db.query<QuestionRow>(
    `INSERT INTO lesson_questions (lesson_id, parent_id, position, prompt, options)
     VALUES ($1, $2,
             (SELECT COALESCE(MAX(position), -1) + 1 FROM lesson_questions WHERE lesson_id = $1),
             $3::jsonb, $4::jsonb)
     RETURNING ${QUESTION_COLS}`,
    [
      fields.lessonId,
      fields.parentId,
      JSON.stringify(fields.prompt),
      JSON.stringify(fields.options),
    ],
  );
  return result.rows[0];
}

export async function findQuestion(
  db: Queryable,
  lessonId: string,
  id: string,
): Promise<QuestionRow | null> {
  const result = await db.query<QuestionRow>(
    `SELECT ${QUESTION_COLS} FROM lesson_questions WHERE lesson_id = $1 AND id = $2`,
    [lessonId, id],
  );
  return result.rows[0] ?? null;
}

export async function listQuestions(
  db: Queryable,
  lessonId: string,
): Promise<QuestionRow[]> {
  const result = await db.query<QuestionRow>(
    `SELECT ${QUESTION_COLS} FROM lesson_questions WHERE lesson_id = $1 ORDER BY position ASC`,
    [lessonId],
  );
  return result.rows;
}

export async function writeQuestion(
  db: Queryable,
  id: string,
  next: { prompt: unknown; options: unknown },
): Promise<void> {
  await db.query(
    `UPDATE lesson_questions SET prompt = $2::jsonb, options = $3::jsonb WHERE id = $1`,
    [id, JSON.stringify(next.prompt), JSON.stringify(next.options)],
  );
}

export async function retireQuestion(db: Queryable, id: string): Promise<void> {
  await db.query(
    `UPDATE lesson_questions SET retired_at = now() WHERE id = $1`,
    [id],
  );
}

export async function removeQuestion(db: Queryable, id: string): Promise<void> {
  await db.query(`DELETE FROM lesson_questions WHERE id = $1`, [id]);
}

export async function replaceQuestionScreens(
  db: Queryable,
  questionId: string,
  screenIds: string[],
): Promise<void> {
  await db.query(`DELETE FROM question_screens WHERE question_id = $1`, [
    questionId,
  ]);
  if (screenIds.length === 0) return;
  await db.query(
    `INSERT INTO question_screens (question_id, screen_id)
     SELECT $1, screen_id FROM unnest($2::uuid[]) AS screen_id`,
    [questionId, screenIds],
  );
}

export async function replaceQuestionConcepts(
  db: Queryable,
  questionId: string,
  conceptIds: string[],
): Promise<void> {
  await db.query(`DELETE FROM question_concepts WHERE question_id = $1`, [
    questionId,
  ]);
  if (conceptIds.length === 0) return;
  await db.query(
    `INSERT INTO question_concepts (question_id, concept_id)
     SELECT $1, concept_id FROM unnest($2::uuid[]) AS concept_id`,
    [questionId, conceptIds],
  );
}

export interface QuestionLinks {
  screens: Map<string, string[]>;
  concepts: Map<string, string[]>;
}

/** Teaching screen numbers and tested concept slugs, per question of the lesson. */
export async function loadQuestionLinks(
  db: Queryable,
  lessonId: string,
): Promise<QuestionLinks> {
  const screens = await db.query<{ question_id: string; number: string }>(
    `SELECT qs.question_id, s.number
     FROM question_screens qs
     JOIN lesson_questions q ON q.id = qs.question_id
     JOIN screens s ON s.id = qs.screen_id
     WHERE q.lesson_id = $1 ORDER BY s.number ASC`,
    [lessonId],
  );
  const concepts = await db.query<{ question_id: string; slug: string }>(
    `SELECT qc.question_id, c.slug
     FROM question_concepts qc
     JOIN lesson_questions q ON q.id = qc.question_id
     JOIN concepts c ON c.id = qc.concept_id
     WHERE q.lesson_id = $1 ORDER BY c.position ASC`,
    [lessonId],
  );
  const group = <T>(
    rows: T[],
    key: (row: T) => string,
    value: (row: T) => string,
  ) => {
    const map = new Map<string, string[]>();
    for (const row of rows)
      map.set(key(row), [...(map.get(key(row)) ?? []), value(row)]);
    return map;
  };
  return {
    screens: group(
      screens.rows,
      (r) => r.question_id,
      (r) => normalizeScreenNumber(r.number),
    ),
    concepts: group(
      concepts.rows,
      (r) => r.question_id,
      (r) => r.slug,
    ),
  };
}

/** Screen ids that any question still teaches (active or retired), so they cannot be deleted. */
export async function screensTaughtByQuestions(
  db: Queryable,
  screenId: string,
): Promise<{ question_id: string; retired: boolean }[]> {
  const result = await db.query<{ question_id: string; retired: boolean }>(
    `SELECT qs.question_id, (q.retired_at IS NOT NULL) AS retired
     FROM question_screens qs JOIN lesson_questions q ON q.id = qs.question_id
     WHERE qs.screen_id = $1`,
    [screenId],
  );
  return result.rows;
}
