import { compactLesson, toCompactBlocks } from "./compact-blocks";
import { validateBlocks } from "./lesson-blocks";

const canonical = [
  {
    type: "paragraph",
    spans: [
      { text: "A " },
      { text: "token", bold: true },
      { text: " is a piece." },
    ],
  },
  {
    type: "list",
    ordered: true,
    items: [[{ text: "one" }], [{ text: "two", italic: true }]],
  },
  { type: "callout", tone: "note", spans: [{ text: "Careful." }] },
  {
    type: "callout",
    tone: "tip",
    spans: [{ text: "Try", italic: true }, { text: " this" }],
  },
  { type: "formula", latex: "x = 1", spoken: "x equals one" },
  { type: "code", language: "python", text: "x = 1" },
  {
    type: "image",
    src: "/schematics/a.svg",
    alt: "A picture",
    display: "inline",
  },
];

describe("toCompactBlocks", () => {
  it("means exactly what the full form means", () => {
    const compact = toCompactBlocks(canonical);
    expect(validateBlocks(compact).issues).toEqual([]);
    expect(validateBlocks(compact).blocks).toEqual(
      validateBlocks(canonical).blocks,
    );
  });

  it("writes plain paragraphs as strings and drops defaults", () => {
    expect(toCompactBlocks(canonical)).toEqual([
      "A **token** is a piece.",
      { type: "list", ordered: true, items: ["one", "*two*"] },
      { type: "callout", text: "Careful." },
      { type: "callout", tone: "tip", text: "*Try* this" },
      { type: "formula", latex: "x = 1", spoken: "x equals one" },
      { type: "code", language: "python", text: "x = 1" },
      {
        type: "image",
        src: "/schematics/a.svg",
        alt: "A picture",
        display: "inline",
      },
    ]);
  });

  it("returns a single plain paragraph as a bare string", () => {
    expect(
      toCompactBlocks([{ type: "paragraph", spans: [{ text: "Hi." }] }]),
    ).toBe("Hi.");
  });

  it("keeps span objects where italic text would end in a space", () => {
    const awkward = [
      {
        type: "paragraph",
        spans: [{ text: "Try ", italic: true }, { text: "this" }],
      },
    ];
    const compact = toCompactBlocks(awkward) as unknown[];
    expect(compact).toEqual(awkward);
    expect(validateBlocks(compact).blocks).toEqual(
      validateBlocks(awkward).blocks,
    );
  });

  it("keeps span objects for anything it cannot write compactly", () => {
    const withMath = [
      {
        type: "paragraph",
        spans: [
          { text: "Take " },
          { text: "x^2", math: { spoken: "x squared" } },
        ],
      },
    ];
    const compact = toCompactBlocks(withMath);
    expect(validateBlocks(compact).blocks).toEqual(
      validateBlocks(withMath).blocks,
    );
  });

  it("leaves invalid input alone so the real error still shows", () => {
    expect(toCompactBlocks([{ type: "nope" }])).toEqual([{ type: "nope" }]);
  });
});

describe("compactLesson", () => {
  const lesson = {
    lesson: { slug: "x", title: "X" },
    screens: [
      { ref: "a", blocks: canonical.slice(0, 1), sources: [{ title: "S" }] },
    ],
    questions: [
      {
        prompt: [{ type: "paragraph", spans: [{ text: "Q?" }] }],
        options: [
          {
            correct: true,
            blocks: [{ type: "paragraph", spans: [{ text: "Yes" }] }],
            reason: [
              {
                type: "paragraph",
                spans: [{ text: "Because.", italic: true }],
              },
            ],
          },
        ],
        teaches: ["a"],
        covers: ["c"],
        variants: [
          {
            prompt: [{ type: "paragraph", spans: [{ text: "Q2?" }] }],
            options: [
              {
                correct: false,
                blocks: [{ type: "paragraph", spans: [{ text: "No" }] }],
                reason: [{ type: "paragraph", spans: [{ text: "Nope." }] }],
              },
            ],
          },
        ],
      },
    ],
  };

  it("compacts screens, prompts, options, reasons and variants, and keeps the rest", () => {
    const compact = compactLesson(lesson);
    expect(compact.lesson).toEqual(lesson.lesson);
    expect(compact.screens[0]).toEqual({
      ref: "a",
      blocks: "A **token** is a piece.",
      sources: [{ title: "S" }],
    });
    expect(compact.questions[0]).toMatchObject({
      prompt: "Q?",
      teaches: ["a"],
      covers: ["c"],
      options: [{ correct: true, blocks: "Yes", reason: "*Because.*" }],
      variants: [
        {
          prompt: "Q2?",
          options: [{ correct: false, blocks: "No", reason: "Nope." }],
        },
      ],
    });
  });

  it("is much shorter", () => {
    expect(JSON.stringify(compactLesson(lesson)).length).toBeLessThan(
      JSON.stringify(lesson).length * 0.6,
    );
  });
});
