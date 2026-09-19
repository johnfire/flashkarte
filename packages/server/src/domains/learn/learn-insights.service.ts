import { getPool } from "../../db/client";
import { requireLesson } from "../lessons/lesson-context";
import { requireOwnedSubject } from "../subjects/subjects.service";

/**
 * For the owner: how often each question is missed. Aggregated over all learners, with no learner
 * identities. Repeated misses are as likely to mean a bad question or an unclear screen as a
 * struggling learner, and this is where the owner sees which.
 */
export async function questionInsights(
  userId: string,
  subjectId: string,
  slug: string,
) {
  await requireOwnedSubject(userId, subjectId);
  const db = getPool();
  const lesson = await requireLesson(db, subjectId, slug);
  const result = await db.query<{
    question_id: string;
    attempts: number;
    misses: number;
    learners: number;
    first_try_wrong: number;
  }>(
    `SELECT q.id AS question_id,
            count(a.id)::int AS attempts,
            count(a.id) FILTER (WHERE NOT a.correct)::int AS misses,
            count(DISTINCT a.user_id)::int AS learners,
            count(DISTINCT a.user_id) FILTER (WHERE NOT a.correct AND a.misses = 1)::int AS first_try_wrong
     FROM lesson_questions q
     LEFT JOIN question_attempts a ON a.question_id = q.id
     WHERE q.lesson_id = $1 AND q.parent_id IS NULL AND q.retired_at IS NULL
     GROUP BY q.id, q.position ORDER BY q.position`,
    [lesson.id],
  );
  return { lesson: slug, questions: result.rows };
}
