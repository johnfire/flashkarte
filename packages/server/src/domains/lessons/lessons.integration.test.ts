import fs from "fs";
import path from "path";
import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import * as accountRepo from "../account/account.repository";
import * as concepts from "../subjects/concepts.service";
import * as subjects from "../subjects/subjects.service";
import { importSubject } from "../subjects/subjects-import.service";
import { importLesson } from "./lesson-import.service";
import * as lessons from "./lessons.service";
import { getOutline } from "./outline.service";
import * as questions from "./questions.service";
import * as screens from "./screens.service";

const OWNER = "10000000-0000-4000-8000-0000000000e1";
const OUTSIDER = "10000000-0000-4000-8000-0000000000e2";

const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const option = (correct: boolean, text = "An answer") => ({
  correct,
  blocks: para(text),
  reason: para("Because."),
});
const goodQuestion = (over: Record<string, unknown> = {}) => ({
  prompt: para("What is it?"),
  options: [option(true), option(false)],
  teaches: ["1"],
  covers: ["token"],
  ...over,
});

let subjectId: string;

async function reset(): Promise<void> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES
       ($1, 'lessons-owner@example.com', 'x'), ($2, 'lessons-outsider@example.com', 'x')`,
    [OWNER, OUTSIDER],
  );
  const subject = await subjects.createSubject(OWNER, "Transformers");
  subjectId = subject.id;
  for (const slug of ["token", "vocabulary", "tokenizer"]) {
    await concepts.addConcept(OWNER, subjectId, {
      slug,
      name: slug,
      kind: "idea",
    });
  }
}

async function makeLesson(slug = "tokens", covers = ["token"]) {
  await lessons.createLesson(OWNER, subjectId, {
    slug,
    title: slug,
    summary: `About ${slug}`,
    covers,
  });
}
const addScreen = (slug: string, text: string, place?: object) =>
  screens.addScreen(
    OWNER,
    subjectId,
    slug,
    { blocks: para(text), place },
    "human",
  );
const numbersOf = async (slug: string) =>
  (await lessons.getLesson(OWNER, subjectId, slug)).screens.map(
    (s) => s.number,
  );

/** A lesson that passes every completeness rule, ready to finish. */
async function makeCompleteLesson(slug = "tokens") {
  await makeLesson(slug);
  for (const text of ["one", "two", "three", "four"])
    await addScreen(slug, text);
  for (const teaches of ["1", "2", "3"]) {
    await questions.addQuestion(
      OWNER,
      subjectId,
      slug,
      goodQuestion({ teaches: [teaches] }),
    );
  }
}

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error("Integration tests require POSTGRES_DB ending in _test");
  }
  await runMigrations();
});
beforeEach(reset);
afterAll(async () => {
  await closePool();
});

describe("database constraints (real Postgres)", () => {
  it("keeps a screen in the same subject as its lesson, and protects a taught screen", async () => {
    await makeLesson();
    const pool = getPool();
    const lesson = (await pool.query("SELECT id FROM lessons LIMIT 1")).rows[0];
    const other = await subjects.createSubject(OWNER, "Other");
    await expect(
      pool.query(
        `INSERT INTO screens (subject_id, lesson_id, number, blocks) VALUES ($1, $2, 1, '[]'::jsonb)`,
        [other.id, lesson.id],
      ),
    ).rejects.toThrow(/screens_lesson_subject_fk/);
    await expect(
      pool.query(
        `INSERT INTO screens (subject_id, lesson_id, number, blocks) VALUES ($1, $2, 0, '[]'::jsonb)`,
        [subjectId, lesson.id],
      ),
    ).rejects.toThrow(/check/);
  });

  it("refuses to delete just a screen a question teaches, yet lets a whole account be erased", async () => {
    await makeLesson();
    await addScreen("tokens", "taught");
    await questions.addQuestion(OWNER, subjectId, "tokens", goodQuestion());
    // Directly, the database protects the screen...
    await expect(getPool().query("DELETE FROM screens")).rejects.toThrow(
      /question_screens_screen_id_fkey/,
    );
    // ...but deleting the account (a cascade that also removes the question) must succeed.
    await getPool().query("DELETE FROM users WHERE id = $1", [OWNER]);
    expect((await getPool().query("SELECT 1 FROM screens")).rowCount).toBe(0);
  });

  it("treats 213.01 and 213.010 as the same screen number, and sorts numerically", async () => {
    await makeLesson();
    await addScreen("tokens", "a", { number: "213.01" });
    await expect(
      addScreen("tokens", "b", { number: "213.010" }),
    ).rejects.toBeInstanceOf(ConflictError);
    await addScreen("tokens", "nine", { number: "9" });
    await addScreen("tokens", "ten", { number: "10" });
    // A text sort would put 10 before 9; the qualified ORDER BY must not.
    expect(await numbersOf("tokens")).toEqual(["9", "10", "213.010"]);
  });

  it("requires a reason on a lesson prerequisite", async () => {
    await makeLesson("a");
    await makeLesson("b");
    const ids = (
      await getPool().query("SELECT id FROM lessons ORDER BY position")
    ).rows;
    await expect(
      getPool().query(
        `INSERT INTO lesson_prerequisites VALUES ($1, $2, '  ')`,
        [ids[0].id, ids[1].id],
      ),
    ).rejects.toThrow(/lesson_prereq_reason/);
  });
});

describe("modules and lessons", () => {
  it("creates a lesson with its coverage checklist, and refuses a duplicate slug", async () => {
    const module = await lessons.createModule(OWNER, subjectId, {
      title: "Input side",
    });
    await lessons.createLesson(OWNER, subjectId, {
      slug: "tokens",
      title: "Tokens",
      summary: "s",
      module: module.id,
      covers: ["token", "vocabulary"],
    });
    const detail = await lessons.getLesson(OWNER, subjectId, "tokens");
    expect(detail.covers.map((c) => c.slug)).toEqual(["token", "vocabulary"]);
    expect(detail.lesson.module_id).toBe(module.id);
    await expect(
      lessons.createLesson(OWNER, subjectId, {
        slug: "tokens",
        title: "again",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("names every unknown concept, and rejects an unknown module", async () => {
    await expect(
      lessons.createLesson(OWNER, subjectId, {
        slug: "x",
        title: "x",
        covers: ["token", "ghost", "phantom"],
      }),
    ).rejects.toThrow(/Unknown concepts: ghost, phantom/);
    await expect(
      lessons.createLesson(OWNER, subjectId, {
        slug: "y",
        title: "y",
        module: "00000000-0000-4000-8000-000000000000",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    // Nothing was created by the failed attempts.
    expect((await getPool().query("SELECT 1 FROM lessons")).rowCount).toBe(0);
  });

  it("hides everything from another user", async () => {
    await makeLesson();
    await expect(
      lessons.getLesson(OUTSIDER, subjectId, "tokens"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      lessons.createModule(OUTSIDER, subjectId, { title: "x" }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(getOutline(OUTSIDER, subjectId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(addScreen("tokens", "x")).resolves.toBeDefined();
    await expect(
      screens.addScreen(
        OUTSIDER,
        subjectId,
        "tokens",
        { blocks: para("x") },
        "human",
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("screens and their numbers", () => {
  it("numbers screens 1, 2, 3 in order, and continues after the subject's highest for a new lesson", async () => {
    await makeLesson("a");
    await makeLesson("b");
    for (const t of ["x", "y", "z"]) await addScreen("a", t);
    await addScreen("b", "first of b");
    expect(await numbersOf("a")).toEqual(["1", "2", "3"]);
    expect(await numbersOf("b")).toEqual(["4"]);
  });

  it("inserts between neighbours the way Chris described: 213, 213.010, 213.020, 213.025", async () => {
    await makeLesson();
    await addScreen("tokens", "s213", { number: "213" });
    await addScreen("tokens", "s214", { number: "214" });
    expect(
      (await addScreen("tokens", "a", { after: "213" })).screen.number,
    ).toBe("213.010");
    expect(
      (await addScreen("tokens", "b", { after: "213.010" })).screen.number,
    ).toBe("213.020");
    expect(
      (await addScreen("tokens", "c", { before: "213.020" })).screen.number,
    ).toBe("213.015");
    expect(await numbersOf("tokens")).toEqual([
      "213",
      "213.010",
      "213.015",
      "213.020",
      "214",
    ]);
  });

  it("gives a clear error for a bad number or an anchor that is not in the lesson", async () => {
    await makeLesson("a");
    await makeLesson("b");
    await addScreen("a", "x");
    await expect(addScreen("a", "y", { number: "abc" })).rejects.toThrow(
      /not a valid screen number/,
    );
    await expect(addScreen("b", "y", { after: "1" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("rejects malformed blocks with their path and stores nothing", async () => {
    await makeLesson();
    await expect(
      screens.addScreen(
        OWNER,
        subjectId,
        "tokens",
        { blocks: [{ type: "paragraph", spans: [] }] },
        "human",
      ),
    ).rejects.toThrow(/blocks\[0\]\.spans/);
    expect(await numbersOf("tokens")).toEqual([]);
  });

  it("keeps the previous content as a revision on every edit, and on retiring", async () => {
    await makeLesson();
    await addScreen("tokens", "first version");
    await screens.updateScreen(OWNER, subjectId, "1", {
      blocks: para("second version"),
    });
    await screens.updateScreen(OWNER, subjectId, "1", {
      blocks: para("third version"),
    });
    await screens.retireScreen(OWNER, subjectId, "1");
    const revisions = await screens.listScreenRevisions(OWNER, subjectId, "1");
    expect(revisions.map((r) => r.change)).toEqual([
      "edited",
      "edited",
      "retired",
    ]);
    expect(JSON.stringify(revisions[0].blocks)).toContain("first version");
    expect(JSON.stringify(revisions[2].blocks)).toContain("third version");
  });

  it("replaces a screen's sources without touching its content", async () => {
    await makeLesson();
    await addScreen("tokens", "sourced text");
    const fixed = [{ title: "Fixed source", url: "https://example.org/a" }];
    await screens.updateScreen(OWNER, subjectId, "1", { sources: fixed });
    const [screen] = (await lessons.getLesson(OWNER, subjectId, "tokens"))
      .screens;
    expect(screen.sources).toEqual(fixed);
    expect(JSON.stringify(screen.blocks)).toContain("sourced text");
    await screens.updateScreen(OWNER, subjectId, "1", { sources: [] });
    const [cleared] = (await lessons.getLesson(OWNER, subjectId, "tokens"))
      .screens;
    expect(cleared.sources).toEqual([]);
  });

  it("a rejected edit leaves the screen as it was", async () => {
    await makeLesson();
    await addScreen("tokens", "keep me");
    await expect(
      screens.updateScreen(OWNER, subjectId, "1", {
        blocks: [{ type: "code", text: "  " }],
      }),
    ).rejects.toBeInstanceOf(ValidationError);
    const [screen] = (await lessons.getLesson(OWNER, subjectId, "tokens"))
      .screens;
    expect(JSON.stringify(screen.blocks)).toContain("keep me");
    expect(await screens.listScreenRevisions(OWNER, subjectId, "1")).toEqual(
      [],
    );
  });

  it("records who wrote a screen (a person or an AI) with its sources", async () => {
    await makeLesson();
    await screens.addScreen(
      OWNER,
      subjectId,
      "tokens",
      {
        blocks: para("x"),
        sources: [
          {
            title: "Attention Is All You Need",
            url: "https://arxiv.org/abs/1706.03762",
          },
        ],
      },
      "ai",
    );
    const [screen] = (await lessons.getLesson(OWNER, subjectId, "tokens"))
      .screens;
    expect(screen.author_kind).toBe("ai");
    expect(JSON.stringify(screen.sources)).toContain("arxiv.org");
  });

  it("hands two simultaneous appends different numbers", async () => {
    await makeLesson();
    const results = await Promise.all(
      ["a", "b", "c", "d", "e"].map((t) => addScreen("tokens", t)),
    );
    const numbers = results.map((r) => r.screen.number).sort();
    expect(new Set(numbers).size).toBe(5);
    expect(await numbersOf("tokens")).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("lets the testing stage renumber a screen, and refuses a number already taken", async () => {
    await makeLesson();
    await addScreen("tokens", "a");
    await addScreen("tokens", "b");
    await screens.updateScreen(OWNER, subjectId, "2", { number: "1.500" });
    expect(await numbersOf("tokens")).toEqual(["1", "1.500"]);
    await expect(
      screens.updateScreen(OWNER, subjectId, "1.5", { number: "1" }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("questions, variants and their links", () => {
  beforeEach(async () => {
    await makeLesson();
    for (const t of ["one", "two", "three"]) await addScreen("tokens", t);
  });

  it("stores a question with the screens that teach it, the concepts it tests, and variants", async () => {
    const { id } = await questions.addQuestion(
      OWNER,
      subjectId,
      "tokens",
      goodQuestion({
        teaches: ["1", "2"],
        variants: [
          { prompt: para("Reworded?"), options: [option(true), option(false)] },
        ],
      }),
    );
    const detail = await lessons.getLesson(OWNER, subjectId, "tokens");
    const question = detail.questions.find((q) => q.id === id)!;
    expect(question.screens).toEqual(["1", "2"]);
    expect(question.covers).toEqual(["token"]);
    expect(question.variants).toHaveLength(1);
  });

  it("refuses a teaching screen that is not in the lesson, and an unknown concept", async () => {
    await expect(
      questions.addQuestion(
        OWNER,
        subjectId,
        "tokens",
        goodQuestion({ teaches: ["99"] }),
      ),
    ).rejects.toThrow(/Teaching screen "99"/);
    await expect(
      questions.addQuestion(
        OWNER,
        subjectId,
        "tokens",
        goodQuestion({ covers: ["ghost"] }),
      ),
    ).rejects.toThrow(/Unknown concept/);
    expect(
      detailCount(await lessons.getLesson(OWNER, subjectId, "tokens")),
    ).toBe(0);
  });

  it("rejects a malformed question atomically: two correct options leaves nothing behind", async () => {
    await expect(
      questions.addQuestion(
        OWNER,
        subjectId,
        "tokens",
        goodQuestion({ options: [option(true), option(true)] }),
      ),
    ).rejects.toThrow(/exactly one correct/);
    expect(
      (await getPool().query("SELECT 1 FROM lesson_questions")).rowCount,
    ).toBe(0);
    expect(
      (await getPool().query("SELECT 1 FROM question_screens")).rowCount,
    ).toBe(0);
  });

  it("a variant inherits its question's screens and concepts and cannot change them", async () => {
    const { id } = await questions.addQuestion(
      OWNER,
      subjectId,
      "tokens",
      goodQuestion(),
    );
    const variant = await questions.addVariant(OWNER, subjectId, "tokens", id, {
      prompt: para("v"),
      options: [option(true), option(false)],
    });
    await expect(
      questions.updateQuestion(OWNER, subjectId, "tokens", variant.id, {
        teaches: ["2"],
      }),
    ).rejects.toThrow(/inherits/);
    await expect(
      questions.addVariant(OWNER, subjectId, "tokens", variant.id, {
        prompt: para("vv"),
        options: [option(true), option(false)],
      }),
    ).rejects.toThrow(/cannot have variants/);
  });

  it("will not delete a screen a question teaches, and says what to do", async () => {
    await questions.addQuestion(
      OWNER,
      subjectId,
      "tokens",
      goodQuestion({ teaches: ["3"] }),
    );
    await expect(screens.deleteScreen(OWNER, subjectId, "3")).rejects.toThrow(
      /point the question at another screen/,
    );
    await screens.deleteScreen(OWNER, subjectId, "2");
    expect(await numbersOf("tokens")).toEqual(["1", "3"]);
  });

  it("deletes a whole lesson even when its questions teach its screens", async () => {
    await questions.addQuestion(OWNER, subjectId, "tokens", goodQuestion());
    await lessons.deleteLesson(OWNER, subjectId, "tokens");
    for (const table of [
      "lessons",
      "screens",
      "lesson_questions",
      "question_screens",
    ]) {
      expect((await getPool().query(`SELECT 1 FROM ${table}`)).rowCount).toBe(
        0,
      );
    }
  });
});

const detailCount = (detail: { questions: unknown[] }) =>
  detail.questions.length;

describe("two levels of checks: saving versus finishing", () => {
  it("lets a half-written lesson be saved, and reports what is still to do", async () => {
    await makeLesson("tokens", ["token", "vocabulary"]);
    await addScreen("tokens", "one");
    const detail = await lessons.getLesson(OWNER, subjectId, "tokens");
    const codes = detail.issues.map((i) => i.code);
    expect(codes).toEqual(
      expect.arrayContaining(["LESSON_NO_QUESTIONS", "CONCEPT_NOT_TESTED"]),
    );
    expect(detail.issues.every((i) => i.level !== "structural")).toBe(true);
  });

  it("refuses to finish an incomplete lesson, listing every gap", async () => {
    await makeLesson("tokens", ["token", "vocabulary"]);
    await addScreen("tokens", "one");
    await expect(
      lessons.finishLesson(OWNER, subjectId, "tokens"),
    ).rejects.toMatchObject({
      context: {
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "LESSON_NO_QUESTIONS" }),
        ]),
      },
    });
    expect(
      (await lessons.getLesson(OWNER, subjectId, "tokens")).lesson.stage,
    ).toBe("testing");
  });

  it("finishes a complete lesson, and only once", async () => {
    await makeCompleteLesson();
    const done = await lessons.finishLesson(OWNER, subjectId, "tokens");
    expect(done.stage).toBe("finished");
    await expect(
      lessons.finishLesson(OWNER, subjectId, "tokens"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("requires spoken text for a formula before finishing, but not before saving", async () => {
    await makeCompleteLesson();
    await screens.addScreen(
      OWNER,
      subjectId,
      "tokens",
      { blocks: [{ type: "formula", latex: "R = V/I" }] },
      "human",
    );
    await expect(
      lessons.finishLesson(OWNER, subjectId, "tokens"),
    ).rejects.toThrow(/not complete enough/);
    await screens.updateScreen(OWNER, subjectId, "5", {
      blocks: [
        { type: "formula", latex: "R = V/I", spoken: "R equals V over I" },
      ],
    });
    await expect(
      lessons.finishLesson(OWNER, subjectId, "tokens"),
    ).resolves.toBeDefined();
  });
});

describe("a finished lesson is additive-only", () => {
  beforeEach(async () => {
    await makeCompleteLesson();
    await lessons.finishLesson(OWNER, subjectId, "tokens");
  });

  it("still accepts a clarifying screen inserted between two others, without touching the numbers", async () => {
    const before = await numbersOf("tokens");
    const inserted = await addScreen("tokens", "clarifying", { after: "2" });
    expect(inserted.screen.number).toBe("2.010");
    expect(await numbersOf("tokens")).toEqual([
      ...before.slice(0, 2),
      "2.010",
      ...before.slice(2),
    ]);
  });

  it("refuses to delete, renumber, change coverage or prerequisites, or delete the lesson", async () => {
    await makeLesson("other");
    await expect(screens.deleteScreen(OWNER, subjectId, "4")).rejects.toThrow(
      /is finished/,
    );
    await expect(
      screens.updateScreen(OWNER, subjectId, "4", { number: "40" }),
    ).rejects.toThrow(/is finished/);
    await expect(
      lessons.updateLesson(OWNER, subjectId, "tokens", {
        covers: ["token", "vocabulary"],
      }),
    ).rejects.toThrow(/is finished/);
    await expect(
      lessons.setPrerequisite(OWNER, subjectId, "tokens", {
        from: "other",
        reason: "r",
      }),
    ).rejects.toThrow(/is finished/);
    await expect(
      lessons.deleteLesson(OWNER, subjectId, "tokens"),
    ).rejects.toThrow(/is finished/);
    const ids = (
      await lessons.getLesson(OWNER, subjectId, "tokens")
    ).questions.map((q) => q.id);
    await expect(
      questions.deleteQuestion(OWNER, subjectId, "tokens", ids[0]),
    ).rejects.toThrow(/is finished/);
  });

  it("still allows editing wording, keeping a revision", async () => {
    await screens.updateScreen(OWNER, subjectId, "1", {
      blocks: para("a corrected sentence"),
    });
    expect(
      (await screens.listScreenRevisions(OWNER, subjectId, "1")).map(
        (r) => r.change,
      ),
    ).toEqual(["edited"]);
    await lessons.updateLesson(OWNER, subjectId, "tokens", {
      title: "Tokens, revised",
    });
  });

  it("retires a wrong screen only once its questions are re-pointed, then hides it and keeps its history", async () => {
    await expect(screens.retireScreen(OWNER, subjectId, "1")).rejects.toThrow(
      /point them at the replacement screen first/,
    );
    const replacement = await addScreen("tokens", "corrected", { after: "1" });
    const question = (
      await lessons.getLesson(OWNER, subjectId, "tokens")
    ).questions.find((q) => q.screens.includes("1"))!;
    await questions.updateQuestion(OWNER, subjectId, "tokens", question.id, {
      teaches: [replacement.screen.number],
    });
    await screens.retireScreen(OWNER, subjectId, "1");
    const detail = await lessons.getLesson(OWNER, subjectId, "tokens");
    expect(detail.screens.find((s) => s.number === "1")?.retired).toBe(true);
    expect(detail.issues.some((i) => i.level === "structural")).toBe(false);
    expect(
      (await screens.listScreenRevisions(OWNER, subjectId, "1")).map(
        (r) => r.change,
      ),
    ).toContain("retired");
  });

  it("adding a question or variant is allowed; retiring a question hides it without deleting it", async () => {
    const added = await questions.addQuestion(
      OWNER,
      subjectId,
      "tokens",
      goodQuestion({ teaches: ["4"] }),
    );
    await questions.addVariant(OWNER, subjectId, "tokens", added.id, {
      prompt: para("v"),
      options: [option(true), option(false)],
    });
    await questions.retireQuestion(OWNER, subjectId, "tokens", added.id);
    const detail = await lessons.getLesson(OWNER, subjectId, "tokens");
    expect(detail.questions.find((q) => q.id === added.id)?.retired).toBe(true);
  });
});

describe("lesson prerequisites and the outline", () => {
  it("rejects a cycle and requires a reason, and the outline follows the graph", async () => {
    const module = await lessons.createModule(OWNER, subjectId, {
      title: "Input side",
    });
    await lessons.createLesson(OWNER, subjectId, {
      slug: "embeddings",
      title: "Embeddings",
      module: module.id,
      covers: ["vocabulary"],
    });
    await lessons.createLesson(OWNER, subjectId, {
      slug: "tokens",
      title: "Tokens",
      module: module.id,
      covers: ["token"],
    });
    await lessons.setPrerequisite(OWNER, subjectId, "embeddings", {
      from: "tokens",
      reason: "an embedding is what a token id becomes",
    });
    await expect(
      lessons.setPrerequisite(OWNER, subjectId, "tokens", {
        from: "embeddings",
        reason: "r",
      }),
    ).rejects.toThrow(/cycle/);
    await expect(
      lessons.setPrerequisite(OWNER, subjectId, "embeddings", {
        from: "tokens",
        reason: "  ",
      }),
    ).rejects.toBeInstanceOf(ValidationError);

    const { modules } = await getOutline(OWNER, subjectId);
    expect(modules[0].lessons.map((l) => l.slug)).toEqual([
      "tokens",
      "embeddings",
    ]);
    expect(modules[0].lessons[1].unlocksAfter[0]).toMatchObject({
      title: "Tokens",
      reason: "an embedding is what a token id becomes",
    });
    expect(modules[0].lessons[0].covers).toEqual(["token"]);
  });

  it("removes a prerequisite, and says so when it is not there", async () => {
    await makeLesson("a");
    await makeLesson("b");
    await lessons.setPrerequisite(OWNER, subjectId, "b", {
      from: "a",
      reason: "r",
    });
    await lessons.removePrerequisite(OWNER, subjectId, "b", "a");
    await expect(
      lessons.removePrerequisite(OWNER, subjectId, "b", "a"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("importing a whole lesson", () => {
  const lessonImport = (over: Record<string, unknown> = {}) => ({
    module: "Input side",
    lesson: {
      slug: "tokens",
      title: "Tokens",
      summary: "What a token is.",
      covers: ["token"],
      prerequisites: [],
    },
    screens: [
      { ref: "def", blocks: para("A token is a piece of text.") },
      { ref: "why", blocks: para("Models never see raw characters.") },
      { blocks: para("Example.") },
      { blocks: para("Recap.") },
    ],
    questions: [
      {
        prompt: para("What is a token?"),
        options: [option(true), option(false)],
        teaches: ["def"],
        covers: ["token"],
        variants: [
          {
            prompt: para("A token is..."),
            options: [option(true), option(false)],
          },
        ],
      },
      {
        prompt: para("Why tokens?"),
        options: [option(true), option(false)],
        teaches: ["why", "def"],
        covers: ["token"],
      },
      {
        prompt: para("Third"),
        options: [option(true), option(false)],
        teaches: ["1"],
        covers: ["token"],
      },
    ],
    ...over,
  });

  it("creates the lesson, module, numbered screens and questions in one go, resolving refs and numbers", async () => {
    const result = await importLesson(OWNER, subjectId, lessonImport(), "ai");
    expect(result.screens.map((s) => s.number)).toEqual(["1", "2", "3", "4"]);
    expect(result.module?.title).toBe("Input side");
    const detail = await lessons.getLesson(OWNER, subjectId, "tokens");
    expect(detail.questions[1].screens).toEqual(["1", "2"]);
    expect(detail.questions[2].screens).toEqual(["1"]);
    expect(detail.screens.every((s) => s.author_kind === "ai")).toBe(true);
    expect(result.issues.some((i) => i.level === "structural")).toBe(false);
    // A complete import can be finished straight away.
    expect(
      await lessons.finishLesson(OWNER, subjectId, "tokens"),
    ).toMatchObject({ stage: "finished" });
  });

  it("reuses an existing module of the same title", async () => {
    await importLesson(OWNER, subjectId, lessonImport(), "ai");
    await importLesson(
      OWNER,
      subjectId,
      lessonImport({
        lesson: {
          slug: "vocab",
          title: "Vocab",
          summary: "s",
          covers: ["vocabulary"],
          prerequisites: [
            { lesson: "tokens", reason: "vocab builds on tokens" },
          ],
        },
        questions: [
          {
            prompt: para("q"),
            options: [option(true), option(false)],
            teaches: ["def"],
            covers: ["vocabulary"],
          },
        ],
      }),
      "ai",
    );
    expect(
      (await getPool().query("SELECT 1 FROM lesson_modules")).rowCount,
    ).toBe(1);
    expect(
      (await getOutline(OWNER, subjectId)).modules[0].lessons.map(
        (l) => l.slug,
      ),
    ).toEqual(["tokens", "vocab"]);
  });

  it("leaves nothing behind when anything is wrong: a bad block, an unknown ref, a cycle", async () => {
    const counts = async () =>
      Promise.all(
        ["lesson_modules", "lessons", "screens", "lesson_questions"].map(
          async (t) => (await getPool().query(`SELECT 1 FROM ${t}`)).rowCount,
        ),
      );
    const badBlock = lessonImport({
      screens: [
        { blocks: para("ok") },
        { blocks: [{ type: "image", src: "https://x.org/a.svg" }] },
      ],
    });
    await expect(
      importLesson(OWNER, subjectId, badBlock, "ai"),
    ).rejects.toThrow(/alt is required/);
    const badRef = lessonImport({
      questions: [
        {
          prompt: para("q"),
          options: [option(true), option(false)],
          teaches: ["nope"],
          covers: ["token"],
        },
      ],
    });
    await expect(importLesson(OWNER, subjectId, badRef, "ai")).rejects.toThrow(
      /Teaching screen "nope"/,
    );
    const twoCorrect = lessonImport({
      questions: [
        {
          prompt: para("q"),
          options: [option(true), option(true)],
          teaches: ["def"],
          covers: ["token"],
        },
      ],
    });
    await expect(
      importLesson(OWNER, subjectId, twoCorrect, "ai"),
    ).rejects.toThrow(/exactly one correct/);
    expect(await counts()).toEqual([0, 0, 0, 0]);
  });

  it("rejects duplicate refs and duplicate lesson slugs", async () => {
    const dup = lessonImport({
      screens: [
        { ref: "a", blocks: para("x") },
        { ref: "a", blocks: para("y") },
      ],
    });
    await expect(importLesson(OWNER, subjectId, dup, "ai")).rejects.toThrow(
      /used twice/,
    );
    await importLesson(OWNER, subjectId, lessonImport(), "ai");
    await expect(
      importLesson(OWNER, subjectId, lessonImport(), "ai"),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("account data export and deletion (real Postgres)", () => {
  it("exports every lesson table for its owner only, and account deletion removes them all", async () => {
    await importLesson(
      OWNER,
      subjectId,
      {
        module: "Input side",
        lesson: {
          slug: "tokens",
          title: "Tokens",
          summary: "s",
          covers: ["token"],
          prerequisites: [],
        },
        screens: [{ ref: "a", blocks: para("one") }, { blocks: para("two") }],
        questions: [
          {
            prompt: para("q"),
            options: [option(true), option(false)],
            teaches: ["a"],
            covers: ["token"],
            variants: [
              { prompt: para("v"), options: [option(true), option(false)] },
            ],
          },
        ],
      },
      "ai",
    );
    await screens.updateScreen(OWNER, subjectId, "1", {
      blocks: para("one, revised"),
    });

    const modules = await accountRepo.findLessonModules(OWNER);
    const exportedLessons = await accountRepo.findLessons(OWNER);
    const exportedScreens = await accountRepo.findScreens(OWNER);
    const exportedQuestions = await accountRepo.findLessonQuestions(OWNER);
    expect(modules.map((m) => m.title)).toEqual(["Input side"]);
    expect(exportedLessons[0]).toMatchObject({
      slug: "tokens",
      covers: ["token"],
      prerequisites: [],
    });
    expect(exportedScreens.map((s) => s.number)).toEqual(["1", "2"]);
    expect(exportedScreens[0].revisions.map((r) => r.change)).toEqual([
      "edited",
    ]);
    expect(exportedQuestions).toHaveLength(2);
    expect(exportedQuestions.find((q) => q.parent_id === null)).toMatchObject({
      teaches: ["1"],
      covers: ["token"],
    });

    for (const find of [
      accountRepo.findLessonModules,
      accountRepo.findLessons,
      accountRepo.findScreens,
      accountRepo.findLessonQuestions,
    ]) {
      expect(await find(OUTSIDER)).toEqual([]);
    }

    await getPool().query("DELETE FROM users WHERE id = $1", [OWNER]);
    for (const table of [
      "lesson_modules",
      "lessons",
      "lesson_concepts",
      "screens",
      "screen_revisions",
      "lesson_questions",
      "question_screens",
      "question_concepts",
      "lesson_prerequisites",
    ]) {
      expect((await getPool().query(`SELECT 1 FROM ${table}`)).rowCount).toBe(
        0,
      );
    }
  });
});

describe("a real lesson: Transformers, tokens (draft content for the pilot)", () => {
  const readFixture = (name: string) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8"));

  it("imports, lints clean, finishes, and shows in the outline", async () => {
    // The concepts the lesson covers come from the reviewed Transformers subject.
    const graph = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          "..",
          "subjects",
          "fixtures",
          "transformers-subject.json",
        ),
        "utf8",
      ),
    );
    const real = await importSubject(OWNER, {
      title: graph.title,
      concepts: graph.concepts.map((c: { cards: unknown[] }) => ({
        ...c,
        cards: [],
      })),
      edges: graph.edges,
    });
    const result = await importLesson(
      OWNER,
      real.subject.id,
      readFixture("transformers-tokens-lesson.json"),
      "ai",
    );

    expect(result.screens).toHaveLength(5);
    expect(result.question_ids).toHaveLength(4);
    expect(result.issues).toEqual([]); // no completeness issues and no warnings: 5 screens, 4 questions, every question has a variant

    expect(
      await lessons.finishLesson(OWNER, real.subject.id, "tokens"),
    ).toMatchObject({ stage: "finished" });
    const outline = await getOutline(OWNER, real.subject.id);
    expect(outline.modules[0].title).toBe("Input side: text to vectors");
    expect(outline.modules[0].lessons[0]).toMatchObject({
      slug: "tokens",
      stage: "finished",
      covers: ["Token", "Vocabulary and V", "Token ID", "Tokenizer"],
    });
  });

  it("each question is taught by real screens and every concept is tested", async () => {
    const graph = JSON.parse(
      fs.readFileSync(
        path.join(
          __dirname,
          "..",
          "subjects",
          "fixtures",
          "transformers-subject.json",
        ),
        "utf8",
      ),
    );
    const real = await importSubject(OWNER, {
      title: graph.title,
      concepts: graph.concepts.map((c: { cards: unknown[] }) => ({
        ...c,
        cards: [],
      })),
      edges: graph.edges,
    });
    await importLesson(
      OWNER,
      real.subject.id,
      readFixture("transformers-tokens-lesson.json"),
      "ai",
    );
    const detail = await lessons.getLesson(OWNER, real.subject.id, "tokens");
    expect(
      detail.questions.every(
        (q) => q.screens.length >= 1 && q.variants.length === 1,
      ),
    ).toBe(true);
    expect(new Set(detail.questions.flatMap((q) => q.covers))).toEqual(
      new Set(["token", "vocabulary", "token-id", "tokenizer"]),
    );
    expect(detail.screens.every((s) => s.author_kind === "ai")).toBe(true);
  });
});
