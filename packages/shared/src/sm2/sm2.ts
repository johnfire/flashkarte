export interface Sm2State {
  easiness: number;
  interval: number;
  repetitions: number;
  /** Rating of the previous review; null/absent for a card never reviewed. */
  lastRating?: number | null;
}

export type Sm2Result = Required<Sm2State>;

/** Days until the next review, per rating. Easy is only the entry value. */
const LAPSE_INTERVAL = 1;
const HARD_INTERVAL = 1;
const GOOD_INTERVAL = 2;
const EASY_ENTRY_INTERVAL = 4;

const MIN_EASINESS = 1.3;

/**
 * Flashkarte's scheduler: fixed cadences for Again/Hard/Good, compounding for Easy.
 * `rating` must be an integer 1–5 (1–2 Again, 3 Hard, 4 Good, 5 Easy).
 *
 * Unlike textbook SM-2, a rating takes effect on the interval it is given for,
 * not the one after: Hard always means tomorrow and Good always means two days,
 * whatever the card did before. Only a card that stays on Easy compounds, and it
 * compounds by the easiness this review just produced.
 *
 * `repetitions` still counts consecutive non-lapsed reviews — the `learned`
 * deck stat filters on it, so it must not be repurposed as an Easy streak.
 * Staying on Easy is detected via `lastRating` instead.
 *
 * Kept identical in python/flashmd/sm2/algorithm.py and Kotlin Sm2Algorithm.
 */
export function calculate(state: Sm2State, rating: number): Sm2Result {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`Rating must be 1-5, got ${rating}`);
  }

  const ef =
    state.easiness + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  const easiness = Math.round(Math.max(MIN_EASINESS, ef) * 1e6) / 1e6;

  if (rating < 3) {
    return {
      easiness,
      interval: LAPSE_INTERVAL,
      repetitions: 0,
      lastRating: rating,
    };
  }

  let interval: number;
  if (rating === 3) {
    interval = HARD_INTERVAL;
  } else if (rating === 4) {
    interval = GOOD_INTERVAL;
  } else {
    // Entering Easy from any other level restarts at the entry value; only an
    // Easy-after-Easy compounds. Guard the interval so a corrupt or zero row
    // can't schedule a card at 0 days and wedge it as permanently due.
    const stayedOnEasy = state.lastRating === 5 && state.interval > 0;
    interval = stayedOnEasy
      ? Math.round(state.interval * easiness)
      : EASY_ENTRY_INTERVAL;
  }

  return {
    easiness,
    interval,
    repetitions: state.repetitions + 1,
    lastRating: rating,
  };
}
