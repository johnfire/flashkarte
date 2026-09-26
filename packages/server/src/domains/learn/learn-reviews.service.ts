import {
  answerQuestion,
  comeBackLater,
  continueRemediation,
  describeStep,
  dueQuestionIds,
  reconcile,
  resume,
  scheduleReview,
  startSession,
  type LessonSession,
} from "@flashkarte/shared";
import { withTransaction } from "../../db/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { requireLearningSubject } from "../subjects/subjects.service";
import * as subjectsRepo from "../subjects/subjects.repository";
import { getPool } from "../../db/client";
import * as lessonsRepo from "../lessons/lessons.repository";
import * as questionsRepo from "../lessons/questions.repository";
import {
  loadLesson,
  narrowToQuestion,
  renderStep,
  revealAnswer,
} from "./learn-content";
import { asValidationError, type Random } from "./learn-context";
import * as repo from "./learn.repository";

/** Due reviews for a learner, most overdue first. */
export async function listDueReviews(
  userId: string,
  subjectId: string,
  now: Date = new Date(),
) {
  const subject = await requireLearningSubject(userId, subjectId);
  const db = getPool();
  const [reviews, lessons] = await Promise.all([
    repo.listReviews(db, userId, subjectId),
    lessonsRepo.listLessons(db, subjectId),
  ]);
  const slugOf = new Map(lessons.map((l) => [l.id, l.slug]));
  const dueIds = dueQuestionIds(
    reviews.map((r) => ({
      questionId: r.question_id,
      dueAt: new Date(r.due_at),
    })),
    now,
  );
  const byId = new Map(reviews.map((r) => [r.question_id, r]));
  const upcoming = reviews
    .filter((r) => !dueIds.includes(r.question_id))
    .map((r) => new Date(r.due_at).getTime());
  return {
    // Owner-only feedback tools are hidden for enrolled learners.
    is_owner: subject.user_id === userId,
    due: dueIds.map((id) => ({
      question_id: id,
      lesson: slugOf.get(byId.get(id)!.lesson_id) ?? null,
      due_at: byId.get(id)!.due_at,
    })),
    upcoming: upcoming.length,
    next_due_at:
      upcoming.length > 0
        ? new Date(Math.min(...upcoming)).toISOString()
        : null,
  };
}

async function withReview<T>(
  userId: string,
  subjectId: string,
  questionId: string,
  action: (ctx: {
    db: Parameters<typeof repo.lockLearner>[0];
    review: repo.ReviewRow;
    lesson: lessonsRepo.LessonRow;
    loaded: Awaited<ReturnType<typeof loadLesson>>;
  }) => Promise<T>,
): Promise<T> {
  return withTransaction(async (db) => {
    if (!(await subjectsRepo.findLearningSubject(userId, subjectId, db))) {
      throw new NotFoundError("Subject not found");
    }
    await repo.lockLearner(db, userId, `review:${questionId}`);
    const question = await questionsRepo.findQuestionById(db, questionId);
    const lesson =
      question && (await lessonsRepo.findLessonById(db, question.lesson_id));
    const review = await repo.findReview(db, userId, questionId);
    if (
      !question ||
      question.parent_id !== null ||
      !lesson ||
      lesson.subject_id !== subjectId ||
      !review
    ) {
      throw new NotFoundError("You have no review for that question");
    }
    try {
      return await action({
        db,
        review,
        lesson,
        loaded: narrowToQuestion(await loadLesson(db, lesson), questionId),
      });
    } catch (error) {
      return asValidationError(error);
    }
  });
}

/** Starts (or resumes) the review of one due question: it is asked alone, without the screens. */
export async function startReview(
  userId: string,
  subjectId: string,
  questionId: string,
  random: Random = Math.random,
  now: Date = new Date(),
) {
  return withReview(
    userId,
    subjectId,
    questionId,
    async ({ db, review, loaded }) => {
      if (!loaded.questions.some((q) => q.id === questionId)) {
        throw new ValidationError(
          "That question is no longer part of the lesson",
        );
      }
      let session = review.session
        ? reconcile(review.session, loaded.content, random)
        : null;
      if (!session) {
        if (new Date(review.due_at).getTime() > now.getTime()) {
          throw new ValidationError("That question is not due for review yet", {
            due_at: review.due_at,
          });
        }
        session = startSession(loaded.content, random, {
          skipScreens: true,
          only: [questionId],
        });
      }
      session = resume(session);
      await repo.saveReviewSession(db, userId, questionId, session);
      return {
        question_id: questionId,
        step: renderStep(describeStep(session, loaded.content), loaded),
      };
    },
  );
}

function activeSession(review: repo.ReviewRow): LessonSession {
  if (!review.session) throw new ValidationError("Start this review first");
  return review.session;
}

export async function continueReview(
  userId: string,
  subjectId: string,
  questionId: string,
  random: Random = Math.random,
) {
  return withReview(
    userId,
    subjectId,
    questionId,
    async ({ db, review, loaded }) => {
      const session = continueRemediation(
        reconcile(activeSession(review), loaded.content, random),
        loaded.content,
        random,
      );
      await repo.saveReviewSession(db, userId, questionId, session);
      return {
        question_id: questionId,
        step: renderStep(describeStep(session, loaded.content), loaded),
      };
    },
  );
}

export async function pauseReview(
  userId: string,
  subjectId: string,
  questionId: string,
) {
  return withReview(
    userId,
    subjectId,
    questionId,
    async ({ db, review, loaded }) => {
      const session = comeBackLater(activeSession(review));
      await repo.saveReviewSession(db, userId, questionId, session);
      return {
        question_id: questionId,
        step: renderStep(describeStep(session, loaded.content), loaded),
      };
    },
  );
}

/**
 * Answers the review question. A miss shows the teaching screens and re-asks, as in the lesson.
 * When it is finally right, the first attempt of this review sets the next interval.
 */
export async function answerReview(
  userId: string,
  subjectId: string,
  questionId: string,
  chosenPosition: number,
  random: Random = Math.random,
  now: Date = new Date(),
) {
  return withReview(
    userId,
    subjectId,
    questionId,
    async ({ db, review, loaded }) => {
      const before = reconcile(activeSession(review), loaded.content, random);
      const { session, outcome } = answerQuestion(
        before,
        loaded.content,
        chosenPosition,
        random,
      );
      await repo.recordAttempt(db, {
        userId,
        questionId: outcome.questionId,
        presentationId: outcome.presentationId,
        chosenOption: outcome.chosenOptionIndex,
        correct: outcome.correct,
        phase: "review",
        misses: outcome.misses,
      });
      const answer = revealAnswer(outcome, chosenPosition, before, loaded);
      if (session.phase !== "passed") {
        await repo.saveReviewSession(db, userId, questionId, session);
        return {
          question_id: questionId,
          answer,
          step: renderStep(describeStep(session, loaded.content), loaded),
          next_due_at: null,
        };
      }
      const scheduled = scheduleReview(
        {
          easiness: review.easiness,
          interval: review.interval_days,
          repetitions: review.repetitions,
          lastRating: review.last_rating,
        },
        session.runs[questionId].firstTry ?? "wrong",
        now,
      );
      await repo.upsertReview(db, userId, questionId, {
        easiness: scheduled.state.easiness,
        interval: scheduled.state.interval,
        repetitions: scheduled.state.repetitions,
        lastRating: scheduled.state.lastRating,
        dueAt: scheduled.dueAt,
        reviewedAt: now,
      });
      return {
        question_id: questionId,
        answer,
        step: {
          kind: "review_done" as const,
          first_try: session.runs[questionId].firstTry,
        },
        next_due_at: scheduled.dueAt.toISOString(),
      };
    },
  );
}
