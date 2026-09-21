import { buildOutline, dueQuestionIds, lessonResult } from "@flashkarte/shared";
import { getPool } from "../../db/client";
import * as lessonsRepo from "../lessons/lessons.repository";
import { requireLearningSubject } from "../subjects/subjects.service";
import { lessonAccess } from "./learn-context";
import * as repo from "./learn.repository";

/**
 * The course outline with this learner's state on it: which lessons are open, locked (and what they
 * are waiting for), in progress or passed, how the first attempts went, and how many reviews are due.
 * The structure comes from the same derivation the owner's outline uses, so the two cannot disagree.
 */
export async function getLearnerOutline(
  userId: string,
  subjectId: string,
  now: Date = new Date(),
) {
  const subject = await requireLearningSubject(userId, subjectId);
  const db = getPool();
  const [modules, lessons, covered, prerequisites, progress, reviews, access] =
    await Promise.all([
      lessonsRepo.listModules(db, subjectId),
      lessonsRepo.listLessons(db, subjectId),
      lessonsRepo.listLessonConcepts(db, subjectId),
      lessonsRepo.listPrerequisites(db, subjectId),
      repo.listProgress(db, userId, subjectId),
      repo.listReviews(db, userId, subjectId),
      lessonAccess(db, userId, subjectId),
    ]);
  const outline = buildOutline(
    modules.map((m) => ({ id: m.id, title: m.title, position: m.position })),
    lessons.map((lesson) => ({
      id: lesson.id,
      moduleId: lesson.module_id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      position: lesson.position,
      stage: lesson.stage,
      covers: covered
        .filter((c) => c.lesson_id === lesson.id)
        .map((c) => c.name),
    })),
    prerequisites.map((p) => ({
      from: p.from_lesson,
      to: p.to_lesson,
      reason: p.reason,
    })),
  );
  const progressById = new Map(progress.map((row) => [row.lesson_id, row]));
  const dueCount = dueQuestionIds(
    reviews.map((r) => ({
      questionId: r.question_id,
      dueAt: new Date(r.due_at),
    })),
    now,
  ).length;
  return {
    subject_id: subjectId,
    subject_title: subject.title,
    reviews_due: dueCount,
    modules: outline.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => {
        const row = progressById.get(lesson.id);
        const info = access.get(lesson.id)!;
        const passed = access.get(lesson.id)?.access === "passed";
        const result = passed && row ? lessonResult(row.session) : null;
        return {
          ...lesson,
          access: info.access,
          paused: row?.session.paused ?? false,
          answered:
            row && !passed
              ? Object.values(row.session.runs).filter((r) => r.correct).length
              : null,
          result: result && {
            first_try_right: result.firstTryRight,
            total: result.total,
          },
          unlocksAfter: lesson.unlocksAfter.map((unlock) => ({
            ...unlock,
            passed: !info.missing.includes(unlock.lessonId),
          })),
        };
      }),
    })),
  };
}
