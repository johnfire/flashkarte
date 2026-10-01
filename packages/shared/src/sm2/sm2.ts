export interface Sm2State {
  easiness: number;
  interval: number;
  repetitions: number;
  /** Rating of the previous review; null/absent for a card never reviewed. */
  lastRating?: number | null;
}

export type Sm2Result = Required<Sm2State>;

/** Days until the next review, per rating. Half a day means twelve hours. */
const HARD_INTERVAL = 0.5;
const MEDIUM_INTERVAL = 1;
const GOOD_INTERVAL = 3;
const PERFECT_INTERVAL = 7;

const MIN_EASINESS = 1.3;

/**
 * Flashkarte's scheduler: fixed cadences for Hard/Medium/Good/Perfect.
 * `rating` must be an integer 1–5 (1–2 Hard, 3 Medium, 4 Good, 5 Perfect).
 *
 * Unlike textbook SM-2, a rating takes effect on the interval it is given for,
 * not the one after: every rating always means its displayed interval, whatever
 * the card did before. Rating 1 remains the compatibility value used by wrong
 * diagnostic answers; rating 2 is accepted as the same Hard bucket.
 *
 * `repetitions` still counts consecutive non-lapsed reviews — the `learned`
 * deck stat filters on it, independent of the displayed rating names.
 * Kept identical in python/flashmd/sm2/algorithm.py and Kotlin Sm2Algorithm.
 */
export function calculate(state: Sm2State, rating: number): Sm2Result {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`Rating must be 1-5, got ${rating}`);
  }

  const ef =
    state.easiness + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  const easiness = Math.round(Math.max(MIN_EASINESS, ef) * 1e6) / 1e6;

  if (rating <= 2) {
    return {
      easiness,
      interval: HARD_INTERVAL,
      repetitions: 0,
      lastRating: rating,
    };
  }

  const interval =
    rating === 3
      ? MEDIUM_INTERVAL
      : rating === 4
        ? GOOD_INTERVAL
        : PERFECT_INTERVAL;

  return {
    easiness,
    interval,
    repetitions: state.repetitions + 1,
    lastRating: rating,
  };
}
