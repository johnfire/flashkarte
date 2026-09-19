import {
  answerQuestion,
  canOpen,
  comeBackLater,
  continueRemediation,
  describeStep,
  nextScreen,
  previousScreen,
  reconcile,
  resume,
  scheduleReview,
  startSession,
  type LessonSession,
  type SessionContent,
} from "@flashkarte/shared";
import { NotFoundError, ValidationError } from "../../utils/errors";
import * as lessonsRepo from "../lessons/lessons.repository";
import { renderStep, revealAnswer, type RenderedStep } from "./learn-content";
import {
  lessonAccess,
  withLearnerLesson,
  type LearnerContext,
  type Random,
} from "./learn-context";
import * as repo from "./learn.repository";

const summary = (ctx: LearnerContext) => ({
  slug: ctx.lesson.slug,
  title: ctx.lesson.title,
  stage: ctx.lesson.stage,
});

function stepOf(ctx: LearnerContext, session: LessonSession): RenderedStep {
  return renderStep(describeStep(session, ctx.loaded.content), ctx.loaded);
}

/** The learner's saved session, brought in line with the lesson as it is now. */
function currentSession(ctx: LearnerContext, random: Random): LessonSession {
  if (!ctx.progress)
    throw new NotFoundError("You have not started this lesson: start it first");
  return reconcile(ctx.progress.session, ctx.loaded.content, random);
}

function requireInProgress(ctx: LearnerContext): void {
  if (ctx.progress?.status === "passed") {
    throw new ValidationError("This lesson is already passed");
  }
}

/** Starts a lesson, or resumes it where the learner left off. A locked lesson cannot be started. */
export async function startLesson(
  userId: string,
  subjectId: string,
  slug: string,
  random: Random = Math.random,
) {
  return withLearnerLesson(userId, subjectId, slug, async (ctx) => {
    requireInProgress(ctx);
    if (ctx.progress) {
      const session = resume(currentSession(ctx, random));
      await repo.saveProgress(ctx.db, userId, ctx.lesson.id, session, null);
      return {
        lesson: summary(ctx),
        resumed: true,
        step: stepOf(ctx, session),
      };
    }
    const access = (await lessonAccess(ctx.db, userId, subjectId)).get(
      ctx.lesson.id,
    )!;
    if (!canOpen(access)) {
      const titles = (await lessonsRepo.listLessons(ctx.db, subjectId))
        .filter((l) => access.missing.includes(l.id))
        .map((l) => `"${l.title}"`);
      throw new ValidationError(
        `This lesson is locked: pass ${titles.join(", ")} first`,
        {
          missing: access.missing,
        },
      );
    }
    const session = startSession(ctx.loaded.content, random);
    await repo.saveProgress(ctx.db, userId, ctx.lesson.id, session, null);
    return { lesson: summary(ctx), resumed: false, step: stepOf(ctx, session) };
  });
}

/** Applies one engine action to the saved session and returns the new step. */
async function act(
  userId: string,
  subjectId: string,
  slug: string,
  random: Random,
  step: (session: LessonSession, content: SessionContent) => LessonSession,
) {
  return withLearnerLesson(userId, subjectId, slug, async (ctx) => {
    requireInProgress(ctx);
    const next = step(currentSession(ctx, random), ctx.loaded.content);
    await repo.saveProgress(ctx.db, userId, ctx.lesson.id, next, null);
    return { lesson: summary(ctx), step: stepOf(ctx, next) };
  });
}

/** Where the learner is now. Also saves any tidy-up needed because the lesson was edited. */
export async function currentLessonStep(
  userId: string,
  subjectId: string,
  slug: string,
  random: Random = Math.random,
) {
  return act(userId, subjectId, slug, random, (session) => session);
}

export const goNext = (
  u: string,
  s: string,
  l: string,
  random: Random = Math.random,
) =>
  act(u, s, l, random, (session, content) =>
    nextScreen(session, content, random),
  );
export const goBack = (
  u: string,
  s: string,
  l: string,
  random: Random = Math.random,
) =>
  act(u, s, l, random, (session, content) => previousScreen(session, content));
export const continueLesson = (
  u: string,
  s: string,
  l: string,
  random: Random = Math.random,
) =>
  act(u, s, l, random, (session, content) =>
    continueRemediation(session, content, random),
  );
export const pauseLesson = (
  u: string,
  s: string,
  l: string,
  random: Random = Math.random,
) => act(u, s, l, random, (session) => comeBackLater(session));
export const resumeLesson = (
  u: string,
  s: string,
  l: string,
  random: Random = Math.random,
) => act(u, s, l, random, (session) => resume(session));

/**
 * Answers the question on screen. Every answer is recorded in the append-only ledger. Passing the
 * lesson schedules a review for each of its questions and reports which lessons it unlocked.
 */
export async function answerLesson(
  userId: string,
  subjectId: string,
  slug: string,
  chosenPosition: number,
  random: Random = Math.random,
  now: Date = new Date(),
) {
  return withLearnerLesson(userId, subjectId, slug, async (ctx) => {
    requireInProgress(ctx);
    const before = currentSession(ctx, random);
    const { session, outcome } = answerQuestion(
      before,
      ctx.loaded.content,
      chosenPosition,
      random,
    );
    await repo.recordAttempt(ctx.db, {
      userId,
      questionId: outcome.questionId,
      presentationId: outcome.presentationId,
      chosenOption: outcome.chosenOptionIndex,
      correct: outcome.correct,
      phase: "lesson",
      misses: outcome.misses,
    });
    const passed = session.phase === "passed";
    await repo.saveProgress(
      ctx.db,
      userId,
      ctx.lesson.id,
      session,
      passed ? now : null,
    );
    const unlocked = passed
      ? await onPassed(ctx, userId, subjectId, session, now)
      : [];
    return {
      lesson: summary(ctx),
      answer: revealAnswer(outcome, chosenPosition, before, ctx.loaded),
      step: stepOf(ctx, session),
      passed,
      unlocked,
    };
  });
}

/** Schedules a review per question (the first attempt sets where it starts) and finds what just unlocked. */
async function onPassed(
  ctx: LearnerContext,
  userId: string,
  subjectId: string,
  session: LessonSession,
  now: Date,
) {
  for (const [questionId, run] of Object.entries(session.runs)) {
    const scheduled = scheduleReview(null, run.firstTry ?? "wrong", now);
    await repo.upsertReview(ctx.db, userId, questionId, {
      easiness: scheduled.state.easiness,
      interval: scheduled.state.interval,
      repetitions: scheduled.state.repetitions,
      lastRating: scheduled.state.lastRating,
      dueAt: scheduled.dueAt,
      reviewedAt: now,
    });
  }
  const afterAccess = await lessonAccess(ctx.db, userId, subjectId);
  const beforeAccess = await lessonAccess(
    ctx.db,
    userId,
    subjectId,
    new Map([[ctx.lesson.id, "in_progress"]]),
  );
  const lessons = await lessonsRepo.listLessons(ctx.db, subjectId);
  return lessons
    .filter(
      (l) =>
        beforeAccess.get(l.id)?.access === "locked" &&
        afterAccess.get(l.id)?.access === "available",
    )
    .map((l) => ({ slug: l.slug, title: l.title }));
}

/** Open book: every active screen of a lesson the learner may open, to look back at while answering. */
export async function lessonScreens(
  userId: string,
  subjectId: string,
  slug: string,
) {
  return withLearnerLesson(userId, subjectId, slug, async (ctx) => {
    const access = (await lessonAccess(ctx.db, userId, subjectId)).get(
      ctx.lesson.id,
    )!;
    if (!ctx.progress && !canOpen(access))
      throw new ValidationError("This lesson is locked");
    return {
      lesson: summary(ctx),
      screens: ctx.loaded.content.screens.map((number) => ({
        number,
        blocks: ctx.loaded.screens.get(number)?.blocks,
        sources: ctx.loaded.screens.get(number)?.sources ?? null,
        added_in_answer: ctx.loaded.screens.get(number)?.addedInAnswer ?? null,
      })),
    };
  });
}
