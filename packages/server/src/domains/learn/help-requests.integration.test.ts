import { seededRandom } from "@flashkarte/shared";
import { getPool } from "../../db/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { exportData } from "../account/account.service";
import * as lessons from "../lessons/lessons.service";
import {
  MAX_OPEN_HELP_REQUESTS,
  answerRequest,
  listOpenHelpRequests,
  requestHelpOnQuestion,
  requestHelpOnScreen,
} from "./help-requests.service";
import * as learn from "./learn-lessons.service";
import {
  LEARNER,
  STRANGER,
  authorLesson,
  resetCourse,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

let subjectId: string;
const random = () => seededRandom(3);
const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const source = { title: "Transformers in LLMs (flashkarte deck, card 7)" };
const explain = (text: string, sources: unknown[] = [source]) => ({
  blocks: para(text),
  sources,
});

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(async () => {
  subjectId = await resetCourse();
  await authorLesson(subjectId, "tokens", { screens: 4, questions: 3 });
});

const rows = async () =>
  (
    await getPool().query(
      `SELECT * FROM screen_comments WHERE kind = 'help' ORDER BY created_at`,
    )
  ).rows;
const numbers = async () =>
  (await lessons.getLesson(LEARNER, subjectId, "tokens")).screens.map(
    (s) => s.number,
  );

describe("asking for more", () => {
  it("records a request against the screen, with the selected passage and a note, or with neither", async () => {
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "2", {
      selection: "a piece of text",
      note: "why a piece?",
    });
    expect(asked).toMatchObject({ number: "2", question_id: null });
    await requestHelpOnScreen(LEARNER, subjectId, "3", {});
    await requestHelpOnScreen(LEARNER, subjectId, "3", undefined);
    const stored = await rows();
    expect(stored).toHaveLength(3);
    expect(stored[0]).toMatchObject({
      kind: "help",
      selection: "a piece of text",
      body: "why a piece?",
      resolved_at: null,
    });
    expect(stored[1]).toMatchObject({ selection: null, body: "" });
  });

  it("refuses an over-long note or passage, an unknown or retired screen, and a stranger", async () => {
    await expect(
      requestHelpOnScreen(LEARNER, subjectId, "1", { note: "x".repeat(1001) }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      requestHelpOnScreen(LEARNER, subjectId, "1", {
        selection: "x".repeat(501),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      requestHelpOnScreen(LEARNER, subjectId, "99", {}),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      requestHelpOnScreen(LEARNER, subjectId, "not-a-number", {}),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      requestHelpOnScreen(STRANGER, subjectId, "1", {}),
    ).rejects.toBeInstanceOf(NotFoundError);
    await getPool().query(
      `UPDATE screens SET retired_at = now() WHERE number = 4`,
    );
    await expect(
      requestHelpOnScreen(LEARNER, subjectId, "4", {}),
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await rows()).toHaveLength(0);
  });

  it("on a question, is about the screen that teaches it and remembers the question", async () => {
    const detail = await lessons.getLesson(LEARNER, subjectId, "tokens");
    const question = detail.questions[1];
    const asked = await requestHelpOnQuestion(LEARNER, subjectId, question.id, {
      note: "I keep missing this",
    });
    expect(asked.question_id).toBe(question.id);
    expect(asked.number).toBe(question.screens[0]);
    await expect(
      requestHelpOnQuestion(
        LEARNER,
        subjectId,
        "00000000-0000-4000-8000-000000000000",
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    const variant = (
      await getPool().query(
        `SELECT id FROM lesson_questions WHERE parent_id IS NOT NULL LIMIT 1`,
      )
    ).rows[0].id;
    await expect(
      requestHelpOnQuestion(LEARNER, subjectId, variant, {}),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      requestHelpOnQuestion(STRANGER, subjectId, question.id, {}),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("stops at a limit of open requests", async () => {
    await getPool().query(
      `INSERT INTO screen_comments (user_id, screen_id, kind, body)
       SELECT $1, (SELECT id FROM screens LIMIT 1), 'help', '' FROM generate_series(1, $2)`,
      [LEARNER, MAX_OPEN_HELP_REQUESTS],
    );
    await expect(
      requestHelpOnScreen(LEARNER, subjectId, "1", {}),
    ).rejects.toThrow(/waiting/);
  });
});

describe("what the owner's AI sees", () => {
  it("lists open requests with the screen (and question) they are about, and only for the owner", async () => {
    const detail = await lessons.getLesson(LEARNER, subjectId, "tokens");
    await requestHelpOnScreen(LEARNER, subjectId, "1", {
      note: "what is a token?",
      selection: "token",
    });
    await requestHelpOnQuestion(LEARNER, subjectId, detail.questions[0].id, {});
    const { requests } = await listOpenHelpRequests(LEARNER, subjectId);
    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({
      lesson: "tokens",
      note: "what is a token?",
      selection: "token",
      question: null,
    });
    expect(requests[0].screen).toMatchObject({
      number: "1",
      blocks: para("tokens screen 1"),
    });
    expect(requests[1].question).toMatchObject({ id: detail.questions[0].id });
    expect(
      (await listOpenHelpRequests(LEARNER, subjectId, "tokens")).requests,
    ).toHaveLength(2);
    await expect(
      listOpenHelpRequests(LEARNER, subjectId, "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      listOpenHelpRequests(STRANGER, subjectId),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("does not list a comment (that has its own tool) or an answered request", async () => {
    const { comments } = await import("./screen-comments.service").then(
      (m) => ({ comments: m }),
    );
    await comments.addScreenComment(LEARNER, subjectId, "1", {
      body: "a comment",
    });
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "1", {});
    expect(
      (await listOpenHelpRequests(LEARNER, subjectId)).requests.map(
        (r) => r.id,
      ),
    ).toEqual([asked.id]);
    await answerRequest(
      LEARNER,
      subjectId,
      asked.id,
      { screens: [explain("More.")] },
      "ai",
    );
    expect((await listOpenHelpRequests(LEARNER, subjectId)).requests).toEqual(
      [],
    );
  });
});

describe("answering", () => {
  it("adds sourced screens right after the one asked about, as the AI's, and marks the request answered", async () => {
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "2", {
      note: "why?",
    });
    const answered = await answerRequest(
      LEARNER,
      subjectId,
      asked.id,
      { screens: [explain("First part."), explain("Second part.")] },
      "ai",
    );
    expect(answered.screens).toEqual(["2.010", "2.020"]);
    expect(await numbers()).toEqual(["1", "2", "2.010", "2.020", "3", "4"]);
    const added = (
      await getPool().query(
        `SELECT number::text AS number, author_kind, sources, answers_request FROM screens WHERE answers_request IS NOT NULL ORDER BY number`,
      )
    ).rows;
    expect(added).toEqual([
      {
        number: "2.010",
        author_kind: "ai",
        sources: [source],
        answers_request: asked.id,
      },
      {
        number: "2.020",
        author_kind: "ai",
        sources: [source],
        answers_request: asked.id,
      },
    ]);
    expect((await rows())[0]).toMatchObject({ resolved_by: "ai" });
    expect(answered.issues.filter((i) => i.level === "structural")).toEqual([]);
  });

  it("records a person's own answer as theirs", async () => {
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "1", {});
    await answerRequest(
      LEARNER,
      subjectId,
      asked.id,
      { screens: [explain("Mine.")] },
      "human",
    );
    expect((await rows())[0].resolved_by).toBe("human");
    expect(
      (
        await getPool().query(
          `SELECT author_kind FROM screens WHERE answers_request IS NOT NULL`,
        )
      ).rows[0].author_kind,
    ).toBe("human");
  });

  it("works on a finished lesson, where an insert is safe", async () => {
    await lessons.finishLesson(LEARNER, subjectId, "tokens");
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "3", {});
    await answerRequest(
      LEARNER,
      subjectId,
      asked.id,
      { screens: [explain("Later.")] },
      "ai",
    );
    expect(await numbers()).toContain("3.010");
  });

  it("needs a source on every screen, at most three screens, and valid blocks: and then changes nothing", async () => {
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "1", {});
    for (const bad of [
      { screens: [{ blocks: para("x") }] },
      { screens: [explain("x", [])] },
      { screens: [explain("x", [{ title: "" }])] },
      { screens: [] },
      { screens: [1, 2, 3, 4].map((n) => explain(`part ${n}`)) },
      {
        screens: [
          explain("fine"),
          { blocks: [{ type: "nope" }], sources: [source] },
        ],
      },
    ]) {
      await expect(
        answerRequest(LEARNER, subjectId, asked.id, bad, "ai"),
      ).rejects.toBeInstanceOf(ValidationError);
    }
    expect(await numbers()).toEqual(["1", "2", "3", "4"]);
    expect((await rows())[0].resolved_at).toBeNull();
  });

  it("cannot answer twice, or someone else's or a missing request", async () => {
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "1", {});
    await answerRequest(
      LEARNER,
      subjectId,
      asked.id,
      { screens: [explain("Once.")] },
      "ai",
    );
    await expect(
      answerRequest(
        LEARNER,
        subjectId,
        asked.id,
        { screens: [explain("Twice.")] },
        "ai",
      ),
    ).rejects.toThrow(/already answered/);
    await expect(
      answerRequest(
        LEARNER,
        subjectId,
        "00000000-0000-4000-8000-000000000000",
        { screens: [explain("x")] },
        "ai",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      answerRequest(
        STRANGER,
        subjectId,
        asked.id,
        { screens: [explain("x")] },
        "ai",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("what the learner sees", () => {
  it("is told a request is waiting, then that it was answered and where; the new screen says where it came from", async () => {
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "1", {
      note: "more please",
    });

    const waiting = (
      await learn.currentLessonStep(LEARNER, subjectId, "tokens", random())
    ).step;
    expect(waiting).toMatchObject({
      kind: "screen",
      number: "1",
      help: [{ id: asked.id, status: "open", answers: [] }],
      added_in_answer: null,
    });

    await answerRequest(
      LEARNER,
      subjectId,
      asked.id,
      { screens: [explain("Here is more.")] },
      "ai",
    );
    const answered = (
      await learn.currentLessonStep(LEARNER, subjectId, "tokens", random())
    ).step;
    expect(answered).toMatchObject({
      number: "1",
      help: [{ id: asked.id, status: "answered", answers: ["1.010"] }],
    });

    // Next goes to the new screen, which is labelled and cites its source.
    const next = (await learn.goNext(LEARNER, subjectId, "tokens", random()))
      .step;
    expect(next).toMatchObject({
      kind: "screen",
      number: "1.010",
      added_in_answer: "ai",
      sources: [source],
    });
    // A screen not made for a request carries no such label.
    const after = (await learn.goNext(LEARNER, subjectId, "tokens", random()))
      .step;
    expect(after).toMatchObject({ number: "2", added_in_answer: null });
  });

  it("sees, on a question, that they asked about it", async () => {
    const detail = await lessons.getLesson(LEARNER, subjectId, "tokens");
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    let step = (
      await learn.currentLessonStep(LEARNER, subjectId, "tokens", random())
    ).step;
    while (step.kind === "screen")
      step = (await learn.goNext(LEARNER, subjectId, "tokens", random())).step;
    if (step.kind !== "question") throw new Error("expected a question");
    const asked = await requestHelpOnQuestion(
      LEARNER,
      subjectId,
      step.question_id,
      {},
    );
    const again = (
      await learn.currentLessonStep(LEARNER, subjectId, "tokens", random())
    ).step;
    expect(again).toMatchObject({
      kind: "question",
      help: [{ id: asked.id, status: "open" }],
    });
    expect(detail.questions.map((q) => q.id)).toContain(step.question_id);
  });

  it("does not see another learner's requests", async () => {
    const asked = await requestHelpOnScreen(LEARNER, subjectId, "1", {});
    await getPool().query(
      `UPDATE screen_comments SET user_id = $1 WHERE id = $2`,
      [STRANGER, asked.id],
    );
    await learn.startLesson(LEARNER, subjectId, "tokens", random());
    expect(
      (await learn.currentLessonStep(LEARNER, subjectId, "tokens", random()))
        .step,
    ).toMatchObject({ help: [] });
  });
});

describe("the requests are the learner's data", () => {
  it("are exported with their kind, passage and note, and erased with the account", async () => {
    await requestHelpOnScreen(LEARNER, subjectId, "1", {
      selection: "token",
      note: "more?",
    });
    const exported = (await exportData(LEARNER)).lessonLearning.comments;
    expect(exported).toEqual([
      expect.objectContaining({
        screen: "1",
        kind: "help",
        selection: "token",
        body: "more?",
      }),
    ]);
    await getPool().query("DELETE FROM users WHERE id = $1", [LEARNER]);
    expect(
      (await getPool().query("SELECT 1 FROM screen_comments")).rowCount,
    ).toBe(0);
  });
});
