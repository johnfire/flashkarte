import { calculate, Sm2State } from "./sm2";

const S = (
  easiness: number,
  interval: number,
  repetitions: number,
  lastRating: number | null = null,
): Sm2State => ({ easiness, interval, repetitions, lastRating });

const FRESH = S(2.5, 0, 0);

describe("scheduler parity with python/Kotlin", () => {
  // [ef, interval, reps, lastRating, rating, expectedInterval, expectedEf]
  const cases: [
    number,
    number,
    number,
    number | null,
    number,
    number,
    number,
  ][] = [
    // Fixed cadences apply from the very first review, whatever came before.
    [2.5, 0, 0, null, 3, 1, 2.36],
    [2.5, 0, 0, null, 4, 2, 2.5],
    [2.5, 0, 0, null, 5, 4, 2.6],
    [2.5, 3720, 9, 4, 4, 2, 2.5],
    [2.5, 3720, 9, 4, 3, 1, 2.36],
    // Easy compounds only when the previous review was also Easy.
    [2.6, 4, 1, 5, 5, 11, 2.7],
    [2.6, 4, 1, 4, 5, 4, 2.7],
    [1.3, 100, 9, 5, 3, 1, 1.3],
    // A lapse resets to tomorrow from any interval.
    [2.5, 270, 6, 5, 1, 1, 1.96],
    [2.5, 270, 6, 5, 2, 1, 2.18],
  ];

  test.each(cases)(
    "ef=%p interval=%p reps=%p last=%p rating=%p -> interval=%p ef≈%p",
    (ef, interval, reps, last, rating, expInterval, expEf) => {
      const r = calculate(S(ef, interval, reps, last), rating);
      expect(r.interval).toBe(expInterval);
      expect(Math.abs(r.easiness - expEf)).toBeLessThan(0.01);
    },
  );
});

describe("fixed cadences", () => {
  test("Hard is always tomorrow, Good always two days", () => {
    let hard: Sm2State = FRESH;
    let good: Sm2State = FRESH;
    for (let i = 0; i < 6; i++) {
      hard = calculate(hard, 3);
      good = calculate(good, 4);
      expect(hard.interval).toBe(1);
      expect(good.interval).toBe(2);
    }
  });

  test("a rating takes effect immediately, not one review late", () => {
    // The old SM-2 used the easiness from *before* the rating, so a promotion
    // was delayed a review. Hard->Good must be two days, not one.
    const hard = calculate(FRESH, 3);
    expect(calculate(hard, 4).interval).toBe(2);
    expect(calculate(hard, 5).interval).toBe(4);
  });
});

describe("Easy", () => {
  test("enters at four days and then compounds", () => {
    let s: Sm2State = FRESH;
    const seq: number[] = [];
    for (let i = 0; i < 6; i++) {
      s = calculate(s, 5);
      seq.push(s.interval);
    }
    expect(seq).toEqual([4, 11, 31, 90, 270, 837]);
  });

  test("dropping off Easy and back on restarts at the entry value", () => {
    let s: Sm2State = calculate(calculate(FRESH, 5), 5);
    expect(s.interval).toBe(11);
    s = calculate(s, 4);
    expect(s.interval).toBe(2);
    expect(calculate(s, 5).interval).toBe(4);
  });

  test("a zero interval on an Easy row cannot schedule zero days", () => {
    expect(calculate(S(2.5, 0, 3, 5), 5).interval).toBe(4);
  });
});

describe("state bookkeeping", () => {
  test("rating < 3 resets repetitions and interval", () => {
    expect(calculate(S(2.5, 20, 3, 4), 1)).toMatchObject({
      repetitions: 0,
      interval: 1,
    });
    expect(calculate(S(2.5, 10, 5, 5), 2)).toMatchObject({
      repetitions: 0,
      interval: 1,
    });
  });

  test("repetitions count consecutive non-lapsed reviews, not Easy streaks", () => {
    expect(calculate(S(2.5, 6, 2, 4), 4).repetitions).toBe(3);
    expect(calculate(S(2.5, 6, 2, 5), 3).repetitions).toBe(3);
  });

  test("lastRating is carried into the result", () => {
    expect(calculate(FRESH, 5).lastRating).toBe(5);
    expect(calculate(FRESH, 1).lastRating).toBe(1);
  });

  test("easiness never drops below 1.3", () => {
    expect(calculate(S(1.3, 6, 2), 1).easiness).toBeGreaterThanOrEqual(1.3);
  });

  test("rating out of 1..5 throws", () => {
    expect(() => calculate(FRESH, 0)).toThrow();
    expect(() => calculate(FRESH, 6)).toThrow();
  });
});
