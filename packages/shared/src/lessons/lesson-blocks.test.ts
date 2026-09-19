import {
  formulasWithoutSpokenText,
  inlineMathWithoutSpokenText,
  MAX_BLOCKS_PER_LIST,
  MAX_LIST_ITEMS,
  validateBlocks,
} from "./lesson-blocks";

const text = (value: string, extra: object = {}) => ({ text: value, ...extra });
const paragraph = (value = "A token is a piece of text.") => ({
  type: "paragraph",
  spans: [text(value)],
});

describe("validateBlocks: accepted blocks", () => {
  it("accepts every block type and keeps only known fields", () => {
    const { blocks, issues } = validateBlocks([
      {
        type: "paragraph",
        spans: [
          text("A "),
          text("token", { bold: true }),
          text(" is a piece."),
        ],
      },
      {
        type: "list",
        ordered: false,
        items: [[text("one")], [text("two", { italic: true })]],
      },
      { type: "code", language: "python", text: "x = 1" },
      {
        type: "image",
        src: "https://example.com/a.svg",
        alt: "A diagram",
        display: "expandable",
        caption: "Fig 1",
      },
      { type: "callout", tone: "tip", spans: [text("Remember this.")] },
      {
        type: "formula",
        latex: "R = \\frac{V}{I}",
        spoken: "R equals V over I",
      },
    ]);
    expect(issues).toEqual([]);
    expect(blocks.map((b) => b.type)).toEqual([
      "paragraph",
      "list",
      "code",
      "image",
      "callout",
      "formula",
    ]);
  });

  it("defaults an image to inline and drops unknown extra fields", () => {
    const { blocks } = validateBlocks([
      {
        type: "image",
        src: "/schematics/ch1-rc.svg",
        alt: "RC filter",
        junk: 1,
      },
    ]);
    expect(blocks[0]).toEqual({
      type: "image",
      src: "/schematics/ch1-rc.svg",
      alt: "RC filter",
      display: "inline",
    });
  });

  it("accepts an asset image source", () => {
    const { issues } = validateBlocks([
      {
        type: "image",
        src: "asset:123e4567-e89b-12d3-a456-426614174000",
        alt: "x",
      },
    ]);
    expect(issues).toEqual([]);
  });
});

describe("validateBlocks: structural problems, all reported with their path", () => {
  const messages = (input: unknown) =>
    validateBlocks(input).issues.map((i) => `${i.path} ${i.message}`);

  it("rejects no blocks and too many blocks", () => {
    expect(messages([])).toEqual(["blocks needs at least one block"]);
    expect(messages(undefined)).toEqual(["blocks needs at least one block"]);
    const many = Array.from({ length: MAX_BLOCKS_PER_LIST + 1 }, () =>
      paragraph(),
    );
    expect(messages(many)[0]).toMatch(/more than 20 blocks/);
  });

  it("rejects empty text, including a paragraph of only spaces", () => {
    expect(messages([{ type: "paragraph", spans: [text("   ")] }])).toEqual([
      "blocks[0].spans is empty",
    ]);
    expect(messages([{ type: "paragraph", spans: [] }])).toEqual([
      "blocks[0].spans needs at least one piece of text",
    ]);
  });

  it("rejects an unknown block type and a non-object", () => {
    expect(messages([{ type: "table" }])[0]).toMatch(
      /blocks\[0\]\.type must be one of/,
    );
    expect(messages(["hello"])).toEqual(["blocks[0] must be an object"]);
  });

  it("requires alt text on an image and a valid source", () => {
    expect(
      messages([{ type: "image", src: "https://x.org/a.svg", alt: " " }])[0],
    ).toMatch(/alt is required/);
    expect(
      messages([{ type: "image", src: "javascript:alert(1)", alt: "x" }])[0],
    ).toMatch(/src must be/);
    expect(
      messages([
        { type: "image", src: "data:image/svg+xml;base64,AAAA", alt: "x" },
      ])[0],
    ).toMatch(/src must be/);
    expect(
      messages([
        { type: "image", src: "http://insecure.org/a.png", alt: "x" },
      ])[0],
    ).toMatch(/src must be/);
  });

  it("rejects an empty formula, code block and list, and a bad callout tone", () => {
    expect(messages([{ type: "formula", latex: "" }])).toEqual([
      "blocks[0].latex is empty",
    ]);
    expect(messages([{ type: "code", text: "  " }])).toEqual([
      "blocks[0].text is empty",
    ]);
    expect(messages([{ type: "list", ordered: true, items: [] }])).toEqual([
      "blocks[0].items needs at least one item",
    ]);
    expect(
      messages([{ type: "callout", tone: "loud", spans: [text("x")] }])[0],
    ).toMatch(/tone must be one of/);
    const items = Array.from({ length: MAX_LIST_ITEMS + 1 }, () => [text("x")]);
    expect(messages([{ type: "list", ordered: false, items }])[0]).toMatch(
      /more than 30 items/,
    );
  });

  it("reports every problem at once, each at its own path", () => {
    const found = messages([
      { type: "paragraph", spans: [] },
      { type: "image", src: "https://x.org/a.svg" },
      { type: "formula", latex: "" },
    ]);
    expect(found).toHaveLength(3);
    expect(found[0]).toMatch(/^blocks\[0\]/);
    expect(found[2]).toMatch(/^blocks\[2\]/);
  });

  it("uses the path it is given, so a question option can say where the problem is", () => {
    const { issues } = validateBlocks([], "options[2].reason");
    expect(issues[0].path).toBe("options[2].reason");
  });
});

describe("formulasWithoutSpokenText", () => {
  it("finds formulas that a screen reader could not say", () => {
    const { blocks } = validateBlocks([
      { type: "formula", latex: "a" },
      { type: "formula", latex: "b", spoken: "b" },
    ]);
    expect(formulasWithoutSpokenText(blocks).map((f) => f.latex)).toEqual([
      "a",
    ]);
  });
});

describe("a rendered formula", () => {
  it("keeps its asset and size, and drops a size that is not a plain number", () => {
    const { blocks, issues } = validateBlocks([
      {
        type: "formula",
        latex: "d_k",
        assetId: "a1",
        widthEm: 1.099,
        heightEm: 0.964,
        depthEm: 0.179,
      },
      {
        type: "formula",
        latex: "x",
        widthEm: "wide",
        heightEm: -1,
        depthEm: NaN,
      },
    ]);
    expect(issues).toEqual([]);
    expect(blocks[0]).toMatchObject({
      assetId: "a1",
      widthEm: 1.099,
      heightEm: 0.964,
      depthEm: 0.179,
    });
    expect(blocks[1]).toEqual({ type: "formula", latex: "x" });
  });
});

describe("maths inside a sentence", () => {
  const sentence = (spans: unknown[]) =>
    validateBlocks([{ type: "paragraph", spans }]);

  it("keeps the LaTeX in text and the spoken words in math, in paragraphs, lists and callouts", () => {
    const math = { text: "d_k", math: { spoken: "d sub k" } };
    const { blocks, issues } = validateBlocks([
      { type: "paragraph", spans: [{ text: "The key size " }, math] },
      { type: "list", ordered: false, items: [[math]] },
      { type: "callout", tone: "note", spans: [math] },
    ]);
    expect(issues).toEqual([]);
    expect(blocks).toHaveLength(3);
    expect((blocks[0] as { spans: unknown[] }).spans[1]).toEqual({
      text: "d_k",
      math: { spoken: "d sub k" },
    });
  });

  it("accepts a bare maths span, and keeps only well-formed rendering fields", () => {
    const { blocks, issues } = sentence([
      {
        text: "x_i",
        math: { assetId: "a1", widthEm: 1.2, heightEm: 0.8, depthEm: 0.2 },
      },
      { text: "y", math: { widthEm: "wide", depthEm: -1 } },
    ]);
    expect(issues).toEqual([]);
    const spans = (blocks[0] as { spans: { math: object }[] }).spans;
    expect(spans[0].math).toEqual({
      assetId: "a1",
      widthEm: 1.2,
      heightEm: 0.8,
      depthEm: 0.2,
    });
    expect(spans[1].math).toEqual({});
  });

  it.each([
    [
      "a maths flag that is not an object",
      { text: "x", math: true },
      /math must be an object/,
    ],
    ["empty LaTeX", { text: " ", math: {} }, /needs its LaTeX/],
    [
      "a long formula",
      { text: "x".repeat(301), math: {} },
      /at most 300 characters/,
    ],
    ["bold maths", { text: "x", bold: true, math: {} }, /cannot also be bold/],
  ])("refuses %s", (_name, span, message) => {
    const { issues } = sentence([{ text: "see " }, span]);
    expect(issues.map((i) => `${i.path} ${i.message}`).join("\n")).toMatch(
      message,
    );
  });

  it("finds inline maths a screen reader could not say", () => {
    const { blocks } = validateBlocks([
      {
        type: "paragraph",
        spans: [
          { text: "a", math: {} },
          { text: "b", math: { spoken: "b" } },
          { text: "plain" },
        ],
      },
      { type: "list", ordered: true, items: [[{ text: "c", math: {} }]] },
    ]);
    expect(inlineMathWithoutSpokenText(blocks).map((s) => s.text)).toEqual([
      "a",
      "c",
    ]);
  });
});
