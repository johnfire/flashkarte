import { calculate, type Sm2State } from "../sm2/sm2";
import type { FirstTry } from "./lesson-session";

/**
 * Spaced review of lesson questions, on the scheduler flashcards already use. The first attempt
 * at a question sets its schedule: right first time is a "Good" (a longer interval), right only
 * after a miss is an "Again" (it comes back soon). A review works the same way, so a question a
 * learner keeps missing keeps coming back.
 */

/** The ratings multiple-choice cards already use: 4 for right, 1 for wrong. */
export const RATING_RIGHT = 4;
export const RATING_WRONG = 1;

export const INITIAL_REVIEW_STATE: Sm2State = {
  easiness: 2.5,
  interval: 0,
  repetitions: 0,
  lastRating: null,
};

export interface ScheduledReview {
  state: Required<Sm2State>;
  dueAt: Date;
}

export const ratingFor = (firstTry: FirstTry): number =>
  firstTry === "right" ? RATING_RIGHT : RATING_WRONG;

const DAY_MS = 86_400_000;

/** The next schedule for a question after an attempt made at `at`. A first attempt has no previous state. */
export function scheduleReview(
  previous: Sm2State | null,
  firstTry: FirstTry,
  at: Date,
): ScheduledReview {
  const state = calculate(
    previous ?? INITIAL_REVIEW_STATE,
    ratingFor(firstTry),
  );
  return { state, dueAt: new Date(at.getTime() + state.interval * DAY_MS) };
}

export function isReviewDue(dueAt: Date, now: Date): boolean {
  return dueAt.getTime() <= now.getTime();
}

/** Due questions, most overdue first; ties keep their given order. */
export function dueQuestionIds(
  reviews: { questionId: string; dueAt: Date }[],
  now: Date,
): string[] {
  return reviews
    .filter((review) => isReviewDue(review.dueAt, now))
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .map((review) => review.questionId);
}
