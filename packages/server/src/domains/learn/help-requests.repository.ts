import type { Queryable } from "../../db/queryable";

/** A learner's request for more on a screen, as the owner's AI reads it. */
export interface OpenHelpRow {
  id: string;
  lesson_slug: string;
  number: string;
  blocks: unknown;
  question_id: string | null;
  question_prompt: unknown;
  selection: string | null;
  note: string;
  created_at: string;
}

export async function insertHelp(
  db: Queryable,
  input: {
    userId: string;
    screenId: string;
    questionId: string | null;
    selection: string | null;
    note: string;
  },
): Promise<string> {
  const result = await db.query<{ id: string }>(
    `INSERT INTO screen_comments (user_id, screen_id, kind, question_id, selection, body)
     VALUES ($1, $2, 'help', $3, $4, $5) RETURNING id`,
    [
      input.userId,
      input.screenId,
      input.questionId,
      input.selection,
      input.note,
    ],
  );
  return result.rows[0].id;
}

export async function countOpenHelp(
  db: Queryable,
  subjectId: string,
): Promise<number> {
  const result = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM screen_comments c JOIN screens s ON s.id = c.screen_id
     WHERE s.subject_id = $1 AND c.kind = 'help' AND c.resolved_at IS NULL`,
    [subjectId],
  );
  return result.rows[0].n;
}

/** Open help requests, oldest first, with the screen (and question) each is about. */
export async function listOpenHelp(
  db: Queryable,
  subjectId: string,
  lessonId: string | null,
): Promise<OpenHelpRow[]> {
  const result = await db.query<OpenHelpRow>(
    `SELECT c.id, l.slug AS lesson_slug, s.number::text AS number, s.blocks,
            c.question_id, q.prompt AS question_prompt, c.selection, c.body AS note, c.created_at
     FROM screen_comments c
     JOIN screens s ON s.id = c.screen_id
     JOIN lessons l ON l.id = s.lesson_id
     LEFT JOIN lesson_questions q ON q.id = c.question_id
     WHERE s.subject_id = $1 AND c.kind = 'help' AND c.resolved_at IS NULL
       AND ($2::uuid IS NULL OR s.lesson_id = $2)
     ORDER BY c.created_at, c.id`,
    [subjectId, lessonId],
  );
  return result.rows;
}

export interface RequestRow {
  id: string;
  lesson_id: string;
  number: string;
  resolved_at: string | null;
}

/** A request of this subject, whatever its kind. */
export async function findRequest(
  db: Queryable,
  subjectId: string,
  id: string,
): Promise<RequestRow | null> {
  const result = await db.query<RequestRow>(
    `SELECT c.id, s.lesson_id, s.number::text AS number, c.resolved_at
     FROM screen_comments c JOIN screens s ON s.id = c.screen_id
     WHERE s.subject_id = $1 AND c.id = $2`,
    [subjectId, id],
  );
  return result.rows[0] ?? null;
}

/** What one learner has asked on a lesson's screens, and which screens answered. */
export interface HelpStatusRow {
  id: string;
  number: string;
  question_id: string | null;
  resolved_at: string | null;
  answer_numbers: string[];
}

export async function listHelpStatus(
  db: Queryable,
  userId: string,
  lessonId: string,
): Promise<HelpStatusRow[]> {
  const result = await db.query<HelpStatusRow>(
    `SELECT c.id, s.number::text AS number, c.question_id, c.resolved_at,
            COALESCE((SELECT array_agg(a.number::text ORDER BY a.number) FROM screens a
                      WHERE a.answers_request = c.id AND a.retired_at IS NULL), '{}') AS answer_numbers
     FROM screen_comments c JOIN screens s ON s.id = c.screen_id
     WHERE c.user_id = $1 AND c.kind = 'help' AND s.lesson_id = $2
     ORDER BY c.created_at`,
    [userId, lessonId],
  );
  return result.rows;
}
