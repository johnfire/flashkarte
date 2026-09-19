import type { LessonSession } from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";

export interface LessonProgressRow {
  lesson_id: string;
  status: "in_progress" | "passed";
  session: LessonSession;
  passed_at: string | null;
}

/** One learner's changes to one lesson (or review) run one after the other, never interleaved. */
export async function lockLearner(
  db: Queryable,
  userId: string,
  key: string,
): Promise<void> {
  await db.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
    `learn:${userId}:${key}`,
  ]);
}

export async function findProgress(
  db: Queryable,
  userId: string,
  lessonId: string,
): Promise<LessonProgressRow | null> {
  const result = await db.query<LessonProgressRow>(
    `SELECT lesson_id, status, session, passed_at FROM lesson_progress
     WHERE user_id = $1 AND lesson_id = $2`,
    [userId, lessonId],
  );
  return result.rows[0] ?? null;
}

/** Every lesson's progress for a learner across one subject. */
export async function listProgress(
  db: Queryable,
  userId: string,
  subjectId: string,
): Promise<LessonProgressRow[]> {
  const result = await db.query<LessonProgressRow>(
    `SELECT p.lesson_id, p.status, p.session, p.passed_at
     FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id
     WHERE p.user_id = $1 AND l.subject_id = $2`,
    [userId, subjectId],
  );
  return result.rows;
}

export async function saveProgress(
  db: Queryable,
  userId: string,
  lessonId: string,
  session: LessonSession,
  passedAt: Date | null,
): Promise<void> {
  await db.query(
    `INSERT INTO lesson_progress (user_id, lesson_id, status, session, passed_at)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     ON CONFLICT (user_id, lesson_id) DO UPDATE
       SET status = EXCLUDED.status, session = EXCLUDED.session,
           passed_at = COALESCE(lesson_progress.passed_at, EXCLUDED.passed_at), updated_at = now()`,
    [
      userId,
      lessonId,
      passedAt ? "passed" : "in_progress",
      JSON.stringify(session),
      passedAt,
    ],
  );
}

export async function recordAttempt(
  db: Queryable,
  attempt: {
    userId: string;
    questionId: string;
    presentationId: string;
    chosenOption: number;
    correct: boolean;
    phase: "lesson" | "review";
    misses: number;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO question_attempts (user_id, question_id, presentation_id, chosen_option, correct, phase, misses)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      attempt.userId,
      attempt.questionId,
      attempt.presentationId,
      attempt.chosenOption,
      attempt.correct,
      attempt.phase,
      attempt.misses,
    ],
  );
}

export interface ReviewRow {
  question_id: string;
  easiness: number;
  interval_days: number;
  repetitions: number;
  last_rating: number | null;
  due_at: string;
  session: LessonSession | null;
}

const REVIEW_COLS =
  "question_id, easiness, interval_days, repetitions, last_rating, due_at, session";

export async function findReview(
  db: Queryable,
  userId: string,
  questionId: string,
): Promise<ReviewRow | null> {
  const result = await db.query<ReviewRow>(
    `SELECT ${REVIEW_COLS} FROM question_reviews WHERE user_id = $1 AND question_id = $2`,
    [userId, questionId],
  );
  return result.rows[0] ?? null;
}

/** Every review a learner has in one subject, with its lesson, so due questions can be listed. */
export async function listReviews(
  db: Queryable,
  userId: string,
  subjectId: string,
): Promise<(ReviewRow & { lesson_id: string })[]> {
  const result = await db.query<ReviewRow & { lesson_id: string }>(
    `SELECT r.question_id, r.easiness, r.interval_days, r.repetitions, r.last_rating, r.due_at,
            r.session, q.lesson_id
     FROM question_reviews r
     JOIN lesson_questions q ON q.id = r.question_id
     JOIN lessons l ON l.id = q.lesson_id
     WHERE r.user_id = $1 AND l.subject_id = $2 AND q.retired_at IS NULL`,
    [userId, subjectId],
  );
  return result.rows;
}

export async function upsertReview(
  db: Queryable,
  userId: string,
  questionId: string,
  next: {
    easiness: number;
    interval: number;
    repetitions: number;
    lastRating: number | null;
    dueAt: Date;
    reviewedAt: Date;
  },
): Promise<void> {
  await db.query(
    `INSERT INTO question_reviews (user_id, question_id, easiness, interval_days, repetitions, last_rating, due_at, last_reviewed_at, session)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
     ON CONFLICT (user_id, question_id) DO UPDATE
       SET easiness = EXCLUDED.easiness, interval_days = EXCLUDED.interval_days,
           repetitions = EXCLUDED.repetitions, last_rating = EXCLUDED.last_rating,
           due_at = EXCLUDED.due_at, last_reviewed_at = EXCLUDED.last_reviewed_at, session = NULL`,
    [
      userId,
      questionId,
      next.easiness,
      next.interval,
      next.repetitions,
      next.lastRating,
      next.dueAt,
      next.reviewedAt,
    ],
  );
}

export async function saveReviewSession(
  db: Queryable,
  userId: string,
  questionId: string,
  session: LessonSession,
): Promise<void> {
  await db.query(
    `UPDATE question_reviews SET session = $3::jsonb WHERE user_id = $1 AND question_id = $2`,
    [userId, questionId, JSON.stringify(session)],
  );
}
