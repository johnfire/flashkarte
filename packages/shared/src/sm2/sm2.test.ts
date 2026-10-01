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
    [2.5, 0, 0, null, 4, 3, 2.5],
    [2.5, 0, 0, null, 5, 7, 2.6],
    [2.5, 3720, 9, 4, 4, 3, 2.5],
    [2.5, 3720, 9, 4, 3, 1, 2.36],
    [1.3, 100, 9, 5, 3, 1, 1.3],
    // A Hard rating returns in twelve hours and resets the streak.
    [2.5, 270, 6, 5, 1, 0.5, 1.96],
    [2.5, 270, 6, 5, 2, 0.5, 2.18],
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
  test("Hard, Medium, Good, and Perfect use the product intervals", () => {
    let hard: Sm2State = FRESH;
    let medium: Sm2State = FRESH;
    let good: Sm2State = FRESH;
    let perfect: Sm2State = FRESH;
    for (let i = 0; i < 6; i++) {
      hard = calculate(hard, 1);
      medium = calculate(medium, 3);
      good = calculate(good, 4);
      perfect = calculate(perfect, 5);
      expect(hard.interval).toBe(0.5);
      expect(medium.interval).toBe(1);
      expect(good.interval).toBe(3);
      expect(perfect.interval).toBe(7);
    }
  });

  test("a rating takes effect immediately, not one review late", () => {
    const medium = calculate(FRESH, 3);
    expect(calculate(medium, 4).interval).toBe(3);
    expect(calculate(medium, 5).interval).toBe(7);
  });
});

describe("Perfect", () => {
  test("stays at one week rather than compounding", () => {
    let state: Sm2State = FRESH;
    for (let i = 0; i < 6; i++) {
      state = calculate(state, 5);
      expect(state.interval).toBe(7);
    }
  });
});

describe("state bookkeeping", () => {
  test("Hard resets repetitions and uses a half-day interval", () => {
    expect(calculate(S(2.5, 20, 3, 4), 1)).toMatchObject({
      repetitions: 0,
      interval: 0.5,
    });
    expect(calculate(S(2.5, 10, 5, 5), 2)).toMatchObject({
      repetitions: 0,
      interval: 0.5,
    });
  });

  test("repetitions count consecutive non-lapsed reviews", () => {
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
