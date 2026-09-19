import { seededRandom } from "@flashkarte/shared";
import { getPool } from "../../db/client";
import { exportData } from "../account/account.service";
import { NotFoundError, ValidationError } from "../../utils/errors";
import * as lessons from "../lessons/lessons.service";
import * as questions from "../lessons/questions.service";
import * as screens from "../lessons/screens.service";
import { getLearnerOutline } from "./learn-outline.service";
import * as learn from "./learn-lessons.service";
import * as reviews from "./learn-reviews.service";
import * as comments from "./screen-comments.service";
import { questionInsights } from "./learn-insights.service";
import {
  LEARNER,
  STRANGER,
  authorLesson,
  positionOf,
  readToQuestions,
  playToEnd,
  resetCourse,
  startDatabase,
  stopDatabase,
  textOf,
} from "./test-support/learning-course";

let subjectId: string;
const random = () => seededRandom(7);
const DAY = 24 * 60 * 60 * 1000;

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  subjectId = await resetCourse();
});

describe("starting and reading a lesson", () => {
  it("starts on the first screen with its number, and never shows an answer on a question", async () => {
    await authorLesson(subjectId, "tokens");
    const started = await learn.startLesson(
      LEARNER,
      subjectId,
      "tokens",
      random(),
    );
    expect(started.resumed).toBe(false);
    expect(started.step).toMatchObject({
      kind: "screen",
      number: "1",
      index: 0,
      total: 4,
      can_go_back: false,
    });

    const question = await readToQuestions(subjectId, "tokens", random());
    expect(question.kind).toBe("question");
    const text = JSON.stringify(question);
    expect(text).not.toMatch(/correct|reason|Because/i);
  });

  it("goes back and forward, and resumes where the learner left off", async () => {
    await authorLesson(subjectId, "tokens");
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    await learn.goNext(LEARNER, subjectId, "tokens", random());
    const second = await learn.goNext(LEARNER, subjectId, "tokens", random());
    expect(second.step).toMatchObject({
      kind: "screen",
      number: "3",
      can_go_back: true,
    });
    const back = await learn.goBack(LEARNER, subjectId, "tokens", random());
    expect(back.step).toMatchObject({ number: "2" });

    const again = await learn.startLesson(
      LEARNER,
      subjectId,
      "tokens",
      random(),
    );
    expect(again.resumed).toBe(true);
    expect(again.step).toMatchObject({ kind: "screen", number: "2" });
  });

  it("serialises two taps at once, so neither is lost", async () => {
    await authorLesson(subjectId, "tokens");
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    await Promise.all([
      learn.goNext(LEARNER, subjectId, "tokens", random()),
      learn.goNext(LEARNER, subjectId, "tokens", random()),
    ]);
    const now = await learn.currentLessonStep(
      LEARNER,
      subjectId,
      "tokens",
      random(),
    );
    expect(now.step).toMatchObject({ kind: "screen", index: 2 });
  });

  it("stays on the first screen when going back, and cannot answer before the questions", async () => {
    await authorLesson(subjectId, "tokens");
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    const stay = await learn.goBack(LEARNER, subjectId, "tokens", random());
    expect(stay.step).toMatchObject({ kind: "screen", number: "1" });
    await expect(
      learn.answerLesson(LEARNER, subjectId, "tokens", 0, random()),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("needs a start before any other action, and belongs to its owner", async () => {
    await authorLesson(subjectId, "tokens");
    await expect(
      learn.goNext(LEARNER, subjectId, "tokens", random()),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      learn.startLesson(STRANGER, subjectId, "tokens", random()),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("the question loop", () => {
  it("shows the taught screen after a wrong answer, then asks again, and offers help from the second miss", async () => {
    await authorLesson(subjectId, "tokens", { questions: 1 });
    const question = await readToQuestions(subjectId, "tokens", random());
    const first = await learn.answerLesson(
      LEARNER,
      subjectId,
      "tokens",
      positionOf(question, false),
      random(),
    );
    expect(first.answer.correct).toBe(false);
    expect(first.answer.correct_position).toBe(positionOf(question, true));
    expect(first.step).toMatchObject({
      kind: "remediation",
      number: "1",
      help_offered: false,
    });
    expect(textOf((first.step as { blocks: unknown }).blocks)).toBe(
      "tokens screen 1",
    );

    const again = await learn.continueLesson(
      LEARNER,
      subjectId,
      "tokens",
      random(),
    );
    expect(again.step.kind).toBe("question");
    const second = await learn.answerLesson(
      LEARNER,
      subjectId,
      "tokens",
      positionOf(again.step, false),
      random(),
    );
    expect(second.answer.help_offered).toBe(true);
    expect(second.step).toMatchObject({
      kind: "remediation",
      help_offered: true,
    });
  });

  it("re-asks a different wording after a miss when one exists", async () => {
    await authorLesson(subjectId, "tokens", { questions: 1 });
    const question = await readToQuestions(subjectId, "tokens", random());
    if (question.kind !== "question") throw new Error("expected a question");
    const missed = await learn.answerLesson(
      LEARNER,
      subjectId,
      "tokens",
      positionOf(question, false),
      random(),
    );
    expect(missed.passed).toBe(false);
    const next = (
      await learn.continueLesson(LEARNER, subjectId, "tokens", random())
    ).step as { presentation_id: string };
    expect(next.presentation_id).not.toBe(question.presentation_id);
  });

  it("lets the learner come back later, keeping the place and leaving dependents locked", async () => {
    await authorLesson(subjectId, "tokens", { questions: 1 });
    await authorLesson(subjectId, "embeddings", { requires: ["tokens"] });
    const question = await readToQuestions(subjectId, "tokens", random());
    await learn.answerLesson(
      LEARNER,
      subjectId,
      "tokens",
      positionOf(question, false),
      random(),
    );
    const paused = await learn.pauseLesson(
      LEARNER,
      subjectId,
      "tokens",
      random(),
    );
    expect(paused.step.kind).toBe("paused");
    await expect(
      learn.startLesson(LEARNER, subjectId, "embeddings", random()),
    ).rejects.toThrow(/locked/);
    const resumed = await learn.resumeLesson(
      LEARNER,
      subjectId,
      "tokens",
      random(),
    );
    expect(["remediation", "question"]).toContain(resumed.step.kind);
  });

  it("keeps a learner going when the owner edits the lesson under them", async () => {
    await authorLesson(subjectId, "tokens");
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    await learn.goNext(LEARNER, subjectId, "tokens", random());
    await screens.addScreen(
      LEARNER,
      subjectId,
      "tokens",
      {
        blocks: [{ type: "paragraph", spans: [{ text: "inserted" }] }],
        place: { after: "1" },
      },
      "human",
    );
    const step = (
      await learn.currentLessonStep(LEARNER, subjectId, "tokens", random())
    ).step;
    expect(step.kind).toBe("screen");
    expect((step as { total: number }).total).toBe(5);
  });
});

describe("passing a lesson", () => {
  it("passes when every question is right, records every answer, schedules reviews, and reports what unlocked", async () => {
    await authorLesson(subjectId, "tokens", { questions: 2 });
    await authorLesson(subjectId, "embeddings", { requires: ["tokens"] });
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    const now = new Date("2030-01-01T00:00:00Z");
    const results = await playToEnd(subjectId, "tokens", random(), {
      now,
      missTimes: new Map([[0, 1]]),
    });
    const last = results[results.length - 1];
    expect(last.passed).toBe(true);
    expect(last.unlocked).toEqual([
      { slug: "embeddings", title: "Lesson embeddings" },
    ]);
    expect(last.step).toMatchObject({
      kind: "passed",
      first_try_right: 1,
      total: 2,
    });

    const pool = getPool();
    const attempts = await pool.query(
      `SELECT correct, phase FROM question_attempts ORDER BY attempted_at`,
    );
    expect(attempts.rowCount).toBe(3);
    expect(attempts.rows.filter((r) => !r.correct)).toHaveLength(1);
    expect(attempts.rows.every((r) => r.phase === "lesson")).toBe(true);

    const due = (
      await pool.query(
        `SELECT last_rating, due_at FROM question_reviews ORDER BY last_rating`,
      )
    ).rows;
    expect(due).toHaveLength(2);
    expect(due[0].last_rating).toBe(1);
    expect(new Date(due[0].due_at).getTime()).toBeGreaterThan(now.getTime());
    expect(new Date(due[0].due_at).getTime()).toBeLessThan(
      new Date(due[1].due_at).getTime(),
    );
  });

  it("refuses to start or act on a lesson that is already passed", async () => {
    await authorLesson(subjectId, "tokens", { questions: 1 });
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    await playToEnd(subjectId, "tokens", random());
    await expect(
      learn.startLesson(LEARNER, subjectId, "tokens", random()),
    ).rejects.toThrow(/already passed/);
  });

  it("shows every screen to a learner who may open the lesson (open book), and not a locked one", async () => {
    await authorLesson(subjectId, "tokens");
    await authorLesson(subjectId, "embeddings", { requires: ["tokens"] });
    expect(
      (await learn.lessonScreens(LEARNER, subjectId, "tokens")).screens,
    ).toHaveLength(4);
    await expect(
      learn.lessonScreens(LEARNER, subjectId, "embeddings"),
    ).rejects.toThrow(/locked/);
  });

  it("does not offer a retired question or screen to new learners", async () => {
    await authorLesson(subjectId, "tokens", { questions: 2 });
    const detail = await lessons.getLesson(LEARNER, subjectId, "tokens");
    await questions.retireQuestion(
      LEARNER,
      subjectId,
      "tokens",
      detail.questions[0].id,
    );
    const first = await learn.startLesson(
      LEARNER,
      subjectId,
      "tokens",
      random(),
    );
    expect(first.step).toMatchObject({ total: 4 });
    const results = await playToEnd(subjectId, "tokens", random());
    expect(results[results.length - 1].step).toMatchObject({
      kind: "passed",
      total: 1,
    });
  });
});

describe("the learner's outline", () => {
  it("shows locked, available, in-progress and passed with what a locked lesson waits for", async () => {
    await authorLesson(subjectId, "tokens", { questions: 1 });
    await authorLesson(subjectId, "embeddings", {
      requires: ["tokens"],
      questions: 1,
    });
    const stateOf = async (slug: string) =>
      (await getLearnerOutline(LEARNER, subjectId)).modules
        .flatMap((m) => m.lessons)
        .find((l) => l.slug === slug)!;

    expect((await stateOf("tokens")).access).toBe("available");
    const locked = await stateOf("embeddings");
    expect(locked.access).toBe("locked");
    expect(locked.unlocksAfter.map((u) => u.slug)).toContain("tokens");

    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    expect((await stateOf("tokens")).access).toBe("in_progress");
    await playToEnd(subjectId, "tokens", random());
    const passed = await stateOf("tokens");
    expect(passed.access).toBe("passed");
    expect(passed.result).toEqual({ first_try_right: 1, total: 1 });
    expect((await stateOf("embeddings")).access).toBe("available");
  });
});

describe("spaced review", () => {
  async function passTokens(now: Date, missTimes?: Map<number, number>) {
    await authorLesson(subjectId, "tokens", { questions: 1 });
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    await playToEnd(subjectId, "tokens", random(), { now, missTimes });
  }
  const start = new Date("2030-01-01T00:00:00Z");

  it("has nothing due straight after a pass, and one question due later", async () => {
    await passTokens(start);
    expect(
      (await reviews.listDueReviews(LEARNER, subjectId, start)).due,
    ).toHaveLength(0);
    const later = await reviews.listDueReviews(
      LEARNER,
      subjectId,
      new Date(start.getTime() + 30 * DAY),
    );
    expect(later.due).toHaveLength(1);
    expect(later.due[0].lesson).toBe("tokens");
  });

  it("asks a due question alone, and a right answer pushes the next review out", async () => {
    await passTokens(start);
    const now = new Date(start.getTime() + 30 * DAY);
    const [{ question_id }] = (
      await reviews.listDueReviews(LEARNER, subjectId, now)
    ).due;
    const begun = await reviews.startReview(
      LEARNER,
      subjectId,
      question_id,
      random(),
      now,
    );
    expect(begun.step.kind).toBe("question");
    const answered = await reviews.answerReview(
      LEARNER,
      subjectId,
      question_id,
      positionOf(begun.step, true),
      random(),
      now,
    );
    expect(answered.step).toMatchObject({
      kind: "review_done",
      first_try: "right",
    });
    expect(new Date(answered.next_due_at!).getTime()).toBeGreaterThan(
      now.getTime(),
    );
    expect(
      (await reviews.listDueReviews(LEARNER, subjectId, now)).due,
    ).toHaveLength(0);
    const ledger = await getPool().query(
      `SELECT phase FROM question_attempts ORDER BY attempted_at DESC LIMIT 1`,
    );
    expect(ledger.rows[0].phase).toBe("review");
  });

  it("sends a missed review back to the screen, then re-asks, and reschedules soon", async () => {
    await passTokens(start);
    const now = new Date(start.getTime() + 30 * DAY);
    const [{ question_id }] = (
      await reviews.listDueReviews(LEARNER, subjectId, now)
    ).due;
    const begun = await reviews.startReview(
      LEARNER,
      subjectId,
      question_id,
      random(),
      now,
    );
    const missed = await reviews.answerReview(
      LEARNER,
      subjectId,
      question_id,
      positionOf(begun.step, false),
      random(),
      now,
    );
    expect(missed.step.kind).toBe("remediation");
    const again = await reviews.continueReview(
      LEARNER,
      subjectId,
      question_id,
      random(),
    );
    const done = await reviews.answerReview(
      LEARNER,
      subjectId,
      question_id,
      positionOf(again.step, true),
      random(),
      now,
    );
    expect(done.step).toMatchObject({
      kind: "review_done",
      first_try: "wrong",
    });
    const row = (
      await getPool().query(`SELECT last_rating FROM question_reviews`)
    ).rows[0];
    expect(row.last_rating).toBe(1);
  });

  it("reviews one question alone even when its lesson has several", async () => {
    await authorLesson(subjectId, "tokens", { questions: 3 });
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    await playToEnd(subjectId, "tokens", random(), { now: start });
    const now = new Date(start.getTime() + 30 * DAY);
    const { due } = await reviews.listDueReviews(LEARNER, subjectId, now);
    expect(due).toHaveLength(3);
    const begun = await reviews.startReview(
      LEARNER,
      subjectId,
      due[0].question_id,
      random(),
      now,
    );
    expect(begun.step).toMatchObject({ kind: "question", total: 1 });
    const done = await reviews.answerReview(
      LEARNER,
      subjectId,
      due[0].question_id,
      positionOf(begun.step, true),
      random(),
      now,
    );
    expect(done.step.kind).toBe("review_done");
    expect(
      (await reviews.listDueReviews(LEARNER, subjectId, now)).due,
    ).toHaveLength(2);
  });

  it("refuses a review that is not due yet or does not exist", async () => {
    await passTokens(start);
    const [{ question_id }] = (
      await reviews.listDueReviews(
        LEARNER,
        subjectId,
        new Date(start.getTime() + 30 * DAY),
      )
    ).due;
    await expect(
      reviews.startReview(LEARNER, subjectId, question_id, random(), start),
    ).rejects.toThrow(/not due/);
    await expect(
      reviews.startReview(
        LEARNER,
        subjectId,
        "00000000-0000-4000-8000-000000000000",
        random(),
        start,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      reviews.startReview(STRANGER, subjectId, question_id, random(), start),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("owner insights", () => {
  it("counts attempts and misses per question, with no learner identities", async () => {
    await authorLesson(subjectId, "tokens", { questions: 2 });
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    await playToEnd(subjectId, "tokens", random(), {
      missTimes: new Map([[0, 2]]),
    });
    const insight = await questionInsights(LEARNER, subjectId, "tokens");
    expect(insight.questions).toHaveLength(2);
    const totals = insight.questions.reduce(
      (sum, q) => ({
        attempts: sum.attempts + q.attempts,
        misses: sum.misses + q.misses,
      }),
      { attempts: 0, misses: 0 },
    );
    expect(totals).toEqual({ attempts: 4, misses: 2 });
    expect(JSON.stringify(insight)).not.toContain(LEARNER);
    await expect(
      questionInsights(STRANGER, subjectId, "tokens"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("the learner's data belongs to them", () => {
  const counts = async () =>
    (
      await getPool().query(
        `SELECT (SELECT count(*) FROM lesson_progress)::int AS progress,
                (SELECT count(*) FROM question_attempts)::int AS attempts,
                (SELECT count(*) FROM question_reviews)::int AS reviews`,
      )
    ).rows[0];

  async function learnOneLesson() {
    await authorLesson(subjectId, "tokens", { questions: 2 });
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    await playToEnd(subjectId, "tokens", random(), {
      missTimes: new Map([[0, 1]]),
    });
  }

  it("exports progress, every answer and the review schedule", async () => {
    await learnOneLesson();
    const { lessonLearning } = await exportData(LEARNER);
    expect(lessonLearning.progress).toEqual([
      expect.objectContaining({ lesson: "tokens", status: "passed" }),
    ]);
    expect(lessonLearning.answers).toHaveLength(3);
    expect(lessonLearning.answers.filter((a) => !a.correct)).toHaveLength(1);
    expect(lessonLearning.reviews).toHaveLength(2);
  });

  it("erases all of it with the account", async () => {
    await learnOneLesson();
    expect((await counts()).attempts).toBe(3);
    await getPool().query("DELETE FROM users WHERE id = $1", [LEARNER]);
    expect(await counts()).toEqual({ progress: 0, attempts: 0, reviews: 0 });
  });

  it("erases a lesson's learner data when the lesson itself is deleted", async () => {
    await learnOneLesson();
    await lessons.deleteLesson(LEARNER, subjectId, "tokens");
    expect(await counts()).toEqual({ progress: 0, attempts: 0, reviews: 0 });
  });
});

describe("comments on a screen", () => {
  it("records a comment against the screen's number, lists it open, and resolves it once", async () => {
    await authorLesson(subjectId, "tokens");
    const made = await comments.addScreenComment(LEARNER, subjectId, "2", {
      body: "  What is a byte here?  ",
    });
    expect(made).toMatchObject({ number: "2", body: "What is a byte here?" });

    const open = await comments.listScreenComments(
      LEARNER,
      subjectId,
      "tokens",
    );
    expect(open.comments).toEqual([
      expect.objectContaining({
        number: "2",
        body: "What is a byte here?",
        resolved_at: null,
      }),
    ]);

    await comments.resolveScreenComment(LEARNER, subjectId, made.id, "ai");
    expect(
      (await comments.listScreenComments(LEARNER, subjectId, "tokens"))
        .comments,
    ).toHaveLength(0);
    const all = await comments.listScreenComments(
      LEARNER,
      subjectId,
      "tokens",
      true,
    );
    expect(all.comments[0]).toMatchObject({ resolved_by: "ai" });
    await expect(
      comments.resolveScreenComment(LEARNER, subjectId, made.id, "ai"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses an empty or too long comment, an unknown screen and a stranger", async () => {
    await authorLesson(subjectId, "tokens");
    for (const body of ["", "   ", "x".repeat(2001), undefined]) {
      await expect(
        comments.addScreenComment(LEARNER, subjectId, "1", { body }),
      ).rejects.toBeInstanceOf(ValidationError);
    }
    await expect(
      comments.addScreenComment(LEARNER, subjectId, "99", { body: "hi" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      comments.addScreenComment(STRANGER, subjectId, "1", { body: "hi" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      comments.listScreenComments(STRANGER, subjectId, "tokens"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("is exported, and goes with the screen or the account", async () => {
    await authorLesson(subjectId, "tokens");
    await comments.addScreenComment(LEARNER, subjectId, "1", { body: "one" });
    await comments.addScreenComment(LEARNER, subjectId, "4", { body: "two" });
    expect((await exportData(LEARNER)).lessonLearning.comments).toHaveLength(2);
    await screens.deleteScreen(LEARNER, subjectId, "4"); // no question teaches screen 4
    const left = await getPool().query(
      "SELECT count(*)::int AS n FROM screen_comments",
    );
    expect(left.rows[0].n).toBe(1);
    await getPool().query("DELETE FROM users WHERE id = $1", [LEARNER]);
    expect(
      (await getPool().query("SELECT 1 FROM screen_comments")).rowCount,
    ).toBe(0);
  });
});
