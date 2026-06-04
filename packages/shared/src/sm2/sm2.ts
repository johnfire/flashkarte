export interface Sm2State {
  easiness: number;
  interval: number;
  repetitions: number;
}

export type Sm2Result = Sm2State;

/**
 * Pure SM-2 calculation. `rating` must be an integer 1–5.
 * Interval is computed from the OLD easiness, before easiness is updated.
 * Ported verbatim from python/flashmd/sm2/algorithm.py (identical in Kotlin).
 */
export function calculate(state: Sm2State, rating: number): Sm2Result {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`Rating must be 1-5, got ${rating}`);
  }

  const oldEf = state.easiness;
  const reps = state.repetitions;
  const prevInterval = state.interval;

  let newInterval: number;
  let newReps: number;
  if (rating < 3) {
    newInterval = 1;
    newReps = 0;
  } else {
    if (reps === 0) newInterval = 1;
    else if (reps === 1) newInterval = 6;
    else newInterval = Math.round(prevInterval * oldEf);
    newReps = reps + 1;
  }

  const ef = oldEf + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  const newEf = Math.max(1.3, ef);

  return {
    easiness: Math.round(newEf * 1e6) / 1e6,
    interval: newInterval,
    repetitions: newReps,
  };
}
