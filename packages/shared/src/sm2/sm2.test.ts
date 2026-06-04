import { calculate, Sm2State } from "./sm2";

const S = (
  easiness: number,
  interval: number,
  repetitions: number,
): Sm2State => ({
  easiness,
  interval,
  repetitions,
});

describe("SM-2 parity with python/Kotlin", () => {
  // [ef, interval, reps, rating, expectedInterval, expectedEf]
  const cases: [number, number, number, number, number, number][] = [
    [2.5, 0, 0, 4, 1, 2.5],
    [2.5, 1, 1, 4, 6, 2.5],
    [2.5, 6, 2, 4, 15, 2.5],
    [2.5, 6, 2, 3, 15, 2.36],
    [2.5, 6, 2, 1, 1, 1.96],
    [1.3, 6, 2, 3, 8, 1.3],
  ];

  test.each(cases)(
    "ef=%p interval=%p reps=%p rating=%p -> interval=%p ef≈%p",
    (ef, interval, reps, rating, expInterval, expEf) => {
      const r = calculate(S(ef, interval, reps), rating);
      expect(r.interval).toBe(expInterval);
      expect(Math.abs(r.easiness - expEf)).toBeLessThan(0.01);
    },
  );

  test("rating < 3 resets repetitions to 0 and interval to 1", () => {
    expect(calculate(S(2.5, 20, 3), 1)).toMatchObject({
      repetitions: 0,
      interval: 1,
    });
    expect(calculate(S(2.5, 10, 5), 2)).toMatchObject({
      repetitions: 0,
      interval: 1,
    });
  });

  test("easiness never drops below 1.3", () => {
    expect(calculate(S(1.3, 6, 2), 1).easiness).toBeGreaterThanOrEqual(1.3);
  });

  test("repetitions increment on success", () => {
    expect(calculate(S(2.5, 6, 2), 4).repetitions).toBe(3);
  });

  test("rating out of 1..5 throws", () => {
    expect(() => calculate(S(2.5, 0, 0), 0)).toThrow();
    expect(() => calculate(S(2.5, 0, 0), 6)).toThrow();
  });
});
