import {
  dueQuestionIds,
  isReviewDue,
  ratingFor,
  scheduleReview,
} from "./question-review";

const at = new Date("2026-09-19T10:00:00Z");
const days = (n: number) => new Date(at.getTime() + n * 86_400_000);

describe("scheduleReview", () => {
  it("uses the ratings multiple-choice cards use: 4 for right first time, 1 otherwise", () => {
    expect(ratingFor("right")).toBe(4);
    expect(ratingFor("wrong")).toBe(1);
  });

  it("right first time starts a longer interval (Good: two days)", () => {
    const scheduled = scheduleReview(null, "right", at);
    expect(scheduled.state.interval).toBe(2);
    expect(scheduled.dueAt).toEqual(days(2));
    expect(scheduled.state.repetitions).toBe(1);
  });

  it("right only after a miss starts short (Again: tomorrow) and resets the streak", () => {
    const scheduled = scheduleReview(null, "wrong", at);
    expect(scheduled.state.interval).toBe(1);
    expect(scheduled.dueAt).toEqual(days(1));
    expect(scheduled.state.repetitions).toBe(0);
  });

  it("a later miss in review resets a question that had been going well", () => {
    const good = scheduleReview(
      scheduleReview(null, "right", at).state,
      "right",
      days(2),
    );
    expect(good.state.repetitions).toBe(2);
    const lapsed = scheduleReview(good.state, "wrong", days(4));
    expect(lapsed.state.repetitions).toBe(0);
    expect(lapsed.dueAt).toEqual(days(5));
  });
});

describe("due questions", () => {
  it("a question is due at or after its due time", () => {
    expect(isReviewDue(days(2), days(2))).toBe(true);
    expect(isReviewDue(days(2), days(1))).toBe(false);
  });

  it("lists only the due ones, most overdue first", () => {
    const reviews = [
      { questionId: "later", dueAt: days(3) },
      { questionId: "recent", dueAt: days(-1) },
      { questionId: "overdue", dueAt: days(-5) },
      { questionId: "future", dueAt: days(9) },
    ];
    expect(dueQuestionIds(reviews, days(4))).toEqual([
      "overdue",
      "recent",
      "later",
    ]);
    expect(dueQuestionIds(reviews, days(-9))).toEqual([]);
  });
});
