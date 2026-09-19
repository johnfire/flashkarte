import {
  canFinish,
  canSave,
  lintLesson,
  type LessonInput,
  type OptionInput,
  type QuestionInput,
} from "./lesson-lint";

const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const option = (correct: boolean, text = "An answer"): OptionInput => ({
  correct,
  blocks: para(text),
  reason: para("Because."),
});
const question = (over: Partial<QuestionInput> = {}): QuestionInput => ({
  id: "q1",
  prompt: para("What is it?"),
  options: [option(true), option(false)],
  screens: ["1"],
  covers: ["token"],
  variants: [],
  ...over,
});
const goodLesson = (over: Partial<LessonInput> = {}): LessonInput => ({
  summary: "What a token is.",
  covers: ["token"],
  screens: [1, 2, 3, 4].map((n) => ({
    number: String(n),
    blocks: para(`Screen ${n}`),
  })),
  questions: [1, 2, 3].map((n) =>
    question({
      id: `q${n}`,
      screens: [String(n)],
      variants: [
        {
          id: `v${n}`,
          prompt: para("Again?"),
          options: [option(true), option(false)],
        },
      ],
    }),
  ),
  ...over,
});
const codes = (lesson: LessonInput, level?: string) =>
  lintLesson(lesson)
    .filter((issue) => !level || issue.level === level)
    .map((issue) => issue.code);

describe("lintLesson: a good lesson", () => {
  it("has no issues at all", () => {
    expect(lintLesson(goodLesson())).toEqual([]);
    expect(canSave(lintLesson(goodLesson()))).toBe(true);
    expect(canFinish(lintLesson(goodLesson()))).toBe(true);
  });
});

describe("structural rules block a save", () => {
  it("flags bad blocks with the screen they are on", () => {
    const lesson = goodLesson({
      screens: [
        { number: "1", blocks: [{ type: "paragraph", spans: [] }] },
        { number: "2", blocks: para("ok") },
      ],
    });
    const issue = lintLesson(lesson).find(
      (i) => i.code === "SCREEN_BLOCKS_INVALID",
    );
    expect(issue?.level).toBe("structural");
    expect(issue?.ref).toBe("screen 1");
    expect(canSave(lintLesson(lesson))).toBe(false);
  });

  it("flags a screen with no blocks, an invalid number and a duplicate number", () => {
    expect(
      codes(
        goodLesson({ screens: [{ number: "1", blocks: [] }] }),
        "structural",
      ),
    ).toContain("SCREEN_BLOCKS_INVALID");
    expect(
      codes(
        goodLesson({ screens: [{ number: "abc", blocks: para("x") }] }),
        "structural",
      ),
    ).toContain("SCREEN_NUMBER_INVALID");
    const dup = goodLesson({
      screens: [
        { number: "1", blocks: para("a") },
        { number: "1.000", blocks: para("b") },
      ],
    });
    expect(codes(dup, "structural")).toContain("SCREEN_NUMBER_DUPLICATE");
  });

  it("flags a question that names no screen, or a screen that is not in the lesson", () => {
    const none = goodLesson({ questions: [question({ screens: [] })] });
    expect(codes(none, "structural")).toContain("QUESTION_NO_SCREENS");
    const unknown = goodLesson({ questions: [question({ screens: ["99"] })] });
    expect(codes(unknown, "structural")).toContain("QUESTION_SCREEN_UNKNOWN");
  });

  it("treats 213.01 and 213.010 as the same screen when a question points at it", () => {
    const lesson = goodLesson({
      screens: [{ number: "213.010", blocks: para("x") }],
      questions: [question({ screens: ["213.01"] })],
    });
    expect(codes(lesson, "structural")).toEqual([]);
  });

  it("requires two options and exactly one correct, each with a reason", () => {
    expect(
      codes(
        goodLesson({ questions: [question({ options: [option(true)] })] }),
        "structural",
      ),
    ).toContain("QUESTION_OPTIONS_COUNT");
    expect(
      codes(
        goodLesson({
          questions: [question({ options: [option(true), option(true)] })],
        }),
        "structural",
      ),
    ).toContain("QUESTION_CORRECT_COUNT");
    expect(
      codes(
        goodLesson({
          questions: [question({ options: [option(false), option(false)] })],
        }),
        "structural",
      ),
    ).toContain("QUESTION_CORRECT_COUNT");
    const noReason = { correct: true, blocks: para("a"), reason: [] };
    expect(
      codes(
        goodLesson({
          questions: [question({ options: [noReason, option(false)] })],
        }),
        "structural",
      ),
    ).toContain("OPTION_REASON_INVALID");
  });

  it("checks a variant as strictly as its question", () => {
    const badVariant = question({
      variants: [{ id: "v", prompt: para("p"), options: [option(true)] }],
    });
    expect(
      codes(goodLesson({ questions: [badVariant] }), "structural"),
    ).toContain("QUESTION_OPTIONS_COUNT");
  });

  it("ignores retired screens and questions", () => {
    const lesson = goodLesson({
      screens: [
        ...goodLesson().screens,
        { number: "9", blocks: [], retired: true },
      ],
      questions: [
        ...goodLesson().questions,
        question({ id: "old", screens: ["nope"], retired: true }),
      ],
    });
    expect(lintLesson(lesson)).toEqual([]);
  });
});

describe("completeness rules only block finishing", () => {
  it("lets a half-written lesson be saved but not finished", () => {
    const lesson = goodLesson({ questions: [], summary: "" });
    const issues = lintLesson(lesson);
    expect(canSave(issues)).toBe(true);
    expect(canFinish(issues)).toBe(false);
    expect(codes(lesson, "completeness")).toEqual(
      expect.arrayContaining([
        "LESSON_NO_QUESTIONS",
        "LESSON_NO_SUMMARY",
        "CONCEPT_NOT_TESTED",
      ]),
    );
  });

  it("flags a taught concept nothing tests, and a question testing an unlisted one", () => {
    expect(
      codes(goodLesson({ covers: ["token", "vocabulary"] }), "completeness"),
    ).toEqual(["CONCEPT_NOT_TESTED"]);
    const lesson = goodLesson({
      questions: [question({ covers: ["token", "tokenizer"] })],
    });
    expect(codes(lesson, "completeness")).toContain("QUESTION_COVERS_UNLISTED");
  });

  it("flags a question that tests no concept and a lesson with no screens", () => {
    expect(
      codes(
        goodLesson({ questions: [question({ covers: [] })] }),
        "completeness",
      ),
    ).toContain("QUESTION_NO_COVERS");
    expect(
      codes(goodLesson({ screens: [], questions: [] }), "completeness"),
    ).toContain("LESSON_NO_SCREENS");
  });

  it("requires spoken text for a formula wherever it appears", () => {
    const formula = [{ type: "formula", latex: "R = V/I" }];
    const onScreen = goodLesson({
      screens: [{ number: "1", blocks: formula }],
    });
    expect(codes(onScreen, "completeness")).toContain("FORMULA_NO_SPOKEN_TEXT");
    const inReason = goodLesson({
      questions: [
        question({
          options: [
            { correct: true, blocks: para("a"), reason: formula },
            option(false),
          ],
        }),
      ],
    });
    expect(codes(inReason, "completeness")).toContain("FORMULA_NO_SPOKEN_TEXT");
    const spoken = goodLesson({
      screens: [
        {
          number: "1",
          blocks: [
            { type: "formula", latex: "R = V/I", spoken: "R equals V over I" },
          ],
        },
      ],
    });
    expect(codes(spoken, "completeness")).not.toContain(
      "FORMULA_NO_SPOKEN_TEXT",
    );
  });
});

describe("maths in a sentence", () => {
  it("wants spoken text to finish, but not to save", () => {
    const base = goodLesson();
    const lesson = goodLesson({
      screens: [
        {
          number: base.screens[0].number,
          blocks: [
            {
              type: "paragraph",
              spans: [{ text: "The size " }, { text: "d_k", math: {} }],
            },
          ],
        },
        ...base.screens.slice(1),
      ],
    });
    const issues = lintLesson(lesson);
    expect(codes(lesson, "completeness")).toContain("MATH_NO_SPOKEN_TEXT");
    expect(canSave(issues)).toBe(true);
    expect(canFinish(issues)).toBe(false);
  });
});

describe("images that point at stored diagrams", () => {
  const ASSET = "0a1b2c3d-0000-4000-8000-000000000001";
  // The good lesson with its first screen swapped for one holding the image.
  const withImage = (src: string, assetIds?: string[]) => {
    const base = goodLesson();
    return goodLesson({
      assetIds,
      screens: [
        {
          number: base.screens[0].number,
          blocks: [{ type: "image", src, alt: "A circuit", display: "inline" }],
        },
        ...base.screens.slice(1),
      ],
    });
  };

  it("reports an image whose diagram the subject does not have, but only blocks finishing", () => {
    const lesson = withImage(`asset:${ASSET}`, []);
    const issues = lintLesson(lesson);
    expect(codes(lesson, "completeness")).toContain("IMAGE_ASSET_MISSING");
    expect(canSave(issues)).toBe(true);
    expect(canFinish(issues)).toBe(false);
  });

  it("accepts a diagram the subject holds, whatever the letter case of its id", () => {
    expect(
      codes(withImage(`asset:${ASSET}`, [ASSET.toUpperCase()])),
    ).not.toContain("IMAGE_ASSET_MISSING");
  });

  it("does not check images when it was not told which diagrams exist, and never checks web links", () => {
    expect(codes(withImage(`asset:${ASSET}`))).not.toContain(
      "IMAGE_ASSET_MISSING",
    );
    expect(codes(withImage("https://example.com/x.svg", []))).not.toContain(
      "IMAGE_ASSET_MISSING",
    );
    expect(codes(withImage("/schematics/rc.svg", []))).not.toContain(
      "IMAGE_ASSET_MISSING",
    );
  });
});

describe("warnings never block", () => {
  it("advises on counts and a missing variant", () => {
    const lesson = goodLesson({
      screens: [{ number: "1", blocks: para("only one") }],
      questions: [question({ screens: ["1"] })],
    });
    const issues = lintLesson(lesson);
    expect(
      issues
        .filter((i) => i.level === "warning")
        .map((i) => i.code)
        .sort(),
    ).toEqual(["QUESTION_COUNT", "QUESTION_NO_VARIANT", "SCREEN_COUNT"]);
    expect(canFinish(issues.filter((i) => i.level === "warning"))).toBe(true);
  });

  it("does not warn about counts on an empty lesson (that is a completeness matter)", () => {
    const codesFound = codes(
      goodLesson({ screens: [], questions: [] }),
      "warning",
    );
    expect(codesFound).toEqual([]);
  });
});
