import fs from "fs";
import path from "path";
import { seededRandom } from "@flashkarte/shared";
import { importLesson } from "../lessons/lesson-import.service";
import * as concepts from "../subjects/concepts.service";
import * as subjectsService from "../subjects/subjects.service";
import * as learn from "./learn-lessons.service";
import { getLearnerOutline } from "./learn-outline.service";
import * as reviews from "./learn-reviews.service";
import * as comments from "./screen-comments.service";
import {
  LEARNER,
  positionOf,
  resetCourse,
  startDatabase,
  stopDatabase,
} from "./test-support/learning-course";

/**
 * The learner API's real responses, kept as files the Android app's tests decode with its own
 * types. The server test fails if a response changes shape without the file being regenerated
 * (UPDATE_LEARNER_CONTRACT=1), and the Android test fails if its types cannot read the files, so
 * the two cannot drift apart without a test failing on one side.
 */
const CONTRACT_DIR = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "..",
  "android",
  "app",
  "src",
  "test",
  "resources",
  "learner-contract",
);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

/** Random ids and clock times replaced by fixed placeholders, so the files are stable. */
function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, stable(inner)]),
    );
  }
  if (typeof value === "string" && UUID.test(value)) return "<uuid>";
  if (typeof value === "string" && TIME.test(value)) return "<time>";
  return value;
}

const captured = new Map<string, unknown>();
function capture(name: string, response: unknown): void {
  const body = JSON.parse(JSON.stringify(response));
  // The stored session keeps its questions in database key order, which follows random ids; the
  // per-question results have no meaningful order, so order them for a stable file.
  if (body?.step?.kind === "passed") {
    body.step.questions.sort(
      (
        a: { first_try: string; misses: number },
        b: { first_try: string; misses: number },
      ) => a.first_try.localeCompare(b.first_try) || a.misses - b.misses,
    );
  }
  captured.set(name, stable(body));
}

const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const option = (correct: boolean) => ({
  correct,
  blocks: para(correct ? "RIGHT" : "WRONG"),
  reason: para(correct ? "Because it is." : "Because it is not."),
});
const question = (n: number, teaches: string) => ({
  prompt: para(`Question ${n}`),
  options: [option(true), option(false), option(false)],
  teaches: [teaches],
  covers: ["token"],
  variants: [
    {
      prompt: para(`Question ${n}, reworded`),
      options: [option(true), option(false)],
    },
  ],
});

// One screen with every block type, so the app's types are checked against all of them.
const RICH_SCREEN = [
  {
    type: "paragraph",
    spans: [
      { text: "A " },
      { text: "token", bold: true },
      { text: " is " },
      { text: "a piece", italic: true },
      { text: " of text, like " },
      { text: "cat", code: true },
      { text: " and the key size " },
      { text: "d_k", math: { spoken: "d sub k" } },
    ],
  },
  {
    type: "list",
    ordered: true,
    items: [[{ text: "first" }], [{ text: "second", bold: true }]],
  },
  { type: "list", ordered: false, items: [[{ text: "dot" }]] },
  { type: "code", language: "python", text: "tokens = split(text)" },
  { type: "callout", tone: "warning", spans: [{ text: "Careful here" }] },
  {
    type: "image",
    src: "asset:0a1b2c3d-0000-4000-8000-000000000001",
    alt: "A diagram",
    display: "expandable",
    caption: "Figure 1",
  },
  {
    type: "image",
    src: "https://example.com/rc.svg",
    alt: "A web picture",
    display: "inline",
  },
  { type: "formula", latex: "R = V / I", spoken: "R equals V over I" },
];

beforeAll(startDatabase);
afterAll(async () => {
  await stopDatabase();
});

it("the learner API's responses match the files the Android app decodes", async () => {
  const subjectId = await resetCourse("Contract");
  const random = seededRandom(5);
  await concepts.addConcept(LEARNER, subjectId, {
    slug: "token",
    name: "Token",
    kind: "idea",
  });
  await importLesson(
    LEARNER,
    subjectId,
    {
      module: "Input side",
      lesson: {
        slug: "tokens",
        title: "Tokens",
        summary: "What a token is.",
        covers: ["token"],
      },
      screens: [
        { ref: "s1", blocks: RICH_SCREEN },
        { ref: "s2", blocks: para("Second screen") },
        { ref: "s3", blocks: para("Third screen") },
        { ref: "s4", blocks: para("Fourth screen") },
      ],
      questions: [question(1, "s1"), question(2, "s2"), question(3, "s3")],
    },
    "ai",
  );
  await importLesson(
    LEARNER,
    subjectId,
    {
      module: "Input side",
      lesson: {
        slug: "embeddings",
        title: "Embeddings",
        summary: "Numbers with meaning.",
        covers: ["token"],
        prerequisites: [{ lesson: "tokens", reason: "Tokens first." }],
      },
      screens: [1, 2, 3, 4].map((n) => ({
        ref: `e${n}`,
        blocks: para(`Embedding ${n}`),
      })),
      questions: [1, 2, 3].map((n) => question(n, `e${n}`)),
    },
    "ai",
  );

  capture("subjects", await subjectsService.listSubjects(LEARNER));
  capture("outline-fresh", await getLearnerOutline(LEARNER, subjectId));

  const started = await learn.startLesson(LEARNER, subjectId, "tokens", random);
  capture("start-screen", started);
  capture(
    "next-screen",
    await learn.goNext(LEARNER, subjectId, "tokens", random),
  );
  capture(
    "open-book-screens",
    await learn.lessonScreens(LEARNER, subjectId, "tokens"),
  );
  capture(
    "comment",
    await comments.addScreenComment(LEARNER, subjectId, "1", {
      body: "What is a byte?",
    }),
  );

  let step = (await learn.goNext(LEARNER, subjectId, "tokens", random)).step;
  while (step.kind === "screen") {
    step = (await learn.goNext(LEARNER, subjectId, "tokens", random)).step;
  }
  capture("step-question", { lesson: started.lesson, step });

  const miss = await learn.answerLesson(
    LEARNER,
    subjectId,
    "tokens",
    positionOf(step as never, false),
    random,
  );
  capture("answer-wrong", miss);
  capture(
    "continue-remediation",
    await learn.continueLesson(LEARNER, subjectId, "tokens", random),
  );
  capture(
    "paused",
    await learn.pauseLesson(LEARNER, subjectId, "tokens", random),
  );
  capture("outline-in-progress", await getLearnerOutline(LEARNER, subjectId));

  let current = (await learn.resumeLesson(LEARNER, subjectId, "tokens", random))
    .step;
  let last;
  for (let guard = 0; guard < 40; guard++) {
    if (current.kind === "remediation") {
      current = (
        await learn.continueLesson(LEARNER, subjectId, "tokens", random)
      ).step;
      continue;
    }
    last = await learn.answerLesson(
      LEARNER,
      subjectId,
      "tokens",
      positionOf(current as never, true),
      random,
      new Date("2030-01-01T00:00:00Z"),
    );
    if (last.passed) break;
    capture("answer-right", last);
    current = last.step;
  }
  capture("answer-passed", last);
  capture("outline-passed", await getLearnerOutline(LEARNER, subjectId));

  const later = new Date("2030-03-01T00:00:00Z");
  capture(
    "reviews-due",
    await reviews.listDueReviews(LEARNER, subjectId, later),
  );
  const [{ question_id }] = (
    await reviews.listDueReviews(LEARNER, subjectId, later)
  ).due;
  const begun = await reviews.startReview(
    LEARNER,
    subjectId,
    question_id,
    random,
    later,
  );
  capture("review-start", begun);
  const missed = await reviews.answerReview(
    LEARNER,
    subjectId,
    question_id,
    positionOf(begun.step as never, false),
    random,
    later,
  );
  capture("review-answer-wrong", missed);
  const again = await reviews.continueReview(
    LEARNER,
    subjectId,
    question_id,
    random,
  );
  capture("review-continue", again);
  capture(
    "review-answer-done",
    await reviews.answerReview(
      LEARNER,
      subjectId,
      question_id,
      positionOf(again.step as never, true),
      random,
      later,
    ),
  );

  if (process.env.UPDATE_LEARNER_CONTRACT === "1") {
    fs.mkdirSync(CONTRACT_DIR, { recursive: true });
    for (const [name, response] of captured) {
      fs.writeFileSync(
        path.join(CONTRACT_DIR, `${name}.json`),
        JSON.stringify(response, null, 2) + "\n",
      );
    }
  }
  for (const [name, response] of captured) {
    const file = path.join(CONTRACT_DIR, `${name}.json`);
    expect({ name, body: JSON.parse(fs.readFileSync(file, "utf8")) }).toEqual({
      name,
      body: response,
    });
  }
});
