import type { PoolClient } from "pg";
import {
  SessionError,
  computeLessonAccess,
  type LessonAccessInfo,
  type LessonProgressStatus,
} from "@flashkarte/shared";
import { withTransaction } from "../../db/client";
import type { Queryable } from "../../db/queryable";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { requireLesson } from "../lessons/lesson-context";
import * as lessonsRepo from "../lessons/lessons.repository";
import * as subjectsRepo from "../subjects/subjects.repository";
import { loadLesson, type LoadedLesson } from "./learn-content";
import * as repo from "./learn.repository";

export type Random = () => number;

export interface LearnerContext {
  db: PoolClient;
  subject: subjectsRepo.SubjectRow;
  lesson: lessonsRepo.LessonRow;
  loaded: LoadedLesson;
  progress: repo.LessonProgressRow | null;
}

/** An engine error is the learner doing something the rules do not allow: a 422, not a crash. */
export function asValidationError(error: unknown): never {
  if (error instanceof SessionError) {
    throw new ValidationError(error.message, { code: error.code });
  }
  throw error;
}

/**
 * One learner's action on one lesson, in a transaction that also holds a lock for that learner and
 * lesson, so two taps never interleave. The subject must be the caller's (learners are the owner
 * for now; using someone else's public subject comes with cloning).
 */
export function withLearnerLesson<T>(
  userId: string,
  subjectId: string,
  slug: string,
  action: (ctx: LearnerContext) => Promise<T>,
): Promise<T> {
  return withTransaction(async (db) => {
    const subject = await subjectsRepo.findOwnedSubject(userId, subjectId, db);
    if (!subject) throw new NotFoundError("Subject not found");
    const lesson = await requireLesson(db, subject.id, slug);
    await repo.lockLearner(db, userId, lesson.id);
    const loaded = await loadLesson(db, lesson);
    const progress = await repo.findProgress(db, userId, lesson.id);
    try {
      return await action({ db, subject, lesson, loaded, progress });
    } catch (error) {
      return asValidationError(error);
    }
  });
}

/** Each lesson's access for a learner: available, locked (and by what), in progress, or passed. */
export async function lessonAccess(
  db: Queryable,
  userId: string,
  subjectId: string,
  overrides: Map<string, LessonProgressStatus> = new Map(),
): Promise<Map<string, LessonAccessInfo>> {
  const lessons = await lessonsRepo.listLessons(db, subjectId);
  const prerequisites = await lessonsRepo.listPrerequisites(db, subjectId);
  const progress = await repo.listProgress(db, userId, subjectId);
  const status = new Map<string, LessonProgressStatus>(
    progress.map((row) => [
      row.lesson_id,
      row.status === "passed" ? "passed" : "in_progress",
    ]),
  );
  for (const [id, value] of overrides) status.set(id, value);
  return computeLessonAccess(
    lessons.map((lesson) => lesson.id),
    prerequisites.map((p) => ({ from: p.from_lesson, to: p.to_lesson })),
    status,
  );
}
