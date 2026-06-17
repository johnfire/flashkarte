import { parseDeck } from "./parser";

const SAMPLE = `# Test Deck
*A subtitle line*

---

## Category One

**1. ALPHA — Alpha Particle**
The first letter of the Greek alphabet.
Used in physics to describe helium nuclei.

**2. BETA — Beta Particle**
An electron or positron emitted during beta decay.

## Category Two

**3. GAMMA — Gamma Ray**
High-energy electromagnetic radiation.

This is a second paragraph of the gamma definition.
`;

describe("Markdown deck parser parity with python/Kotlin", () => {
  test("title and source filename", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.title).toBe("Test Deck");
    expect(deck.sourceFilename).toBe("test.md");
  });

  test("card count and fronts", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards.map((c) => c.front)).toEqual([
      "ALPHA — Alpha Particle",
      "BETA — Beta Particle",
      "GAMMA — Gamma Ray",
    ]);
  });

  test("categories carry to following cards", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards.map((c) => c.category)).toEqual([
      "Category One",
      "Category One",
      "Category Two",
    ]);
  });

  test("multi-line single paragraph back joined with space", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards[0].back).toBe(
      "The first letter of the Greek alphabet. Used in physics to describe helium nuclei.",
    );
  });

  test("single line back", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards[1].back).toBe(
      "An electron or positron emitted during beta decay.",
    );
  });

  test("multi-paragraph back split by blank line", () => {
    const deck = parseDeck(SAMPLE, "test.md");
    expect(deck.cards[2].back.split("\n\n")).toEqual([
      "High-energy electromagnetic radiation.",
      "This is a second paragraph of the gamma definition.",
    ]);
  });

  test("no card patterns -> empty cards", () => {
    const deck = parseDeck(
      "# Empty Deck\nNo card patterns here.\n",
      "empty.md",
    );
    expect(deck.title).toBe("Empty Deck");
    expect(deck.cards).toHaveLength(0);
  });

  test("no title falls back to filename", () => {
    const deck = parseDeck(
      "**1. FOO — Bar**\nSome definition.\n",
      "fallback.md",
    );
    expect(deck.title).toBe("fallback.md");
    expect(deck.cards).toHaveLength(1);
  });

  test("card without a category is null", () => {
    const deck = parseDeck("# Deck\n\n**1. FOO — Bar**\nDefinition.\n", "x.md");
    expect(deck.cards[0].category).toBeNull();
  });
});

const QA_SAMPLE = `# AI Terms

Q: AI
A: Artificial Intelligence
The field of building systems that perform tasks normally requiring human intelligence.

Q: ML
A: Machine Learning
A subfield of AI in which systems learn patterns from data.
`;

describe("Markdown deck parser — Q:/A: format", () => {
  test("title, count and fronts", () => {
    const deck = parseDeck(QA_SAMPLE, "ai.md");
    expect(deck.title).toBe("AI Terms");
    expect(deck.cards.map((c) => c.front)).toEqual(["AI", "ML"]);
  });

  test("answer and description become separate paragraphs", () => {
    const deck = parseDeck(QA_SAMPLE, "ai.md");
    expect(deck.cards[0].back.split("\n\n")).toEqual([
      "Artificial Intelligence",
      "The field of building systems that perform tasks normally requiring human intelligence.",
    ]);
  });

  test("Q:/A: with no description yields just the answer", () => {
    const deck = parseDeck("# D\n\nQ: HP\nA: Horsepower\n", "d.md");
    expect(deck.cards).toHaveLength(1);
    expect(deck.cards[0].back).toBe("Horsepower");
  });

  test("a back line starting with A: in the bold format is preserved", () => {
    const deck = parseDeck(
      "# D\n\n**1. FOO**\nA: this is just back text.\n",
      "d.md",
    );
    expect(deck.cards[0].back).toBe("A: this is just back text.");
  });

  test("mixed formats in one file both parse", () => {
    const deck = parseDeck(
      "# D\n\n**1. FOO — Bar**\nDefinition.\n\nQ: AI\nA: Artificial Intelligence\nDesc.\n",
      "d.md",
    );
    expect(deck.cards.map((c) => c.front)).toEqual(["FOO — Bar", "AI"]);
    expect(deck.cards[1].back).toBe("Artificial Intelligence\n\nDesc.");
  });
});

describe("branching syntax", () => {
  const md = `# Forest Path

[start]
**1. You reach a fork. Which way?**
- Go left toward the cave -> cave
- Go right -> meadow

[cave]
**2. A bear blocks the cave.**
- Sneak past -> treasure
- Retreat -> start

[meadow]
**3. A peaceful clearing.**
You rest here.
`;

  it("parses anchors, prompts and options", () => {
    const deck = parseDeck(md);
    const byLabel = Object.fromEntries(deck.cards.map((c) => [c.label, c]));
    expect(deck.cards).toHaveLength(3);
    const start = byLabel["start"];
    expect(start.type).toBe("branch");
    expect(start.front).toBe("You reach a fork. Which way?");
    expect(start.options).toEqual([
      { text: "Go left toward the cave", goto: "cave" },
      { text: "Go right", goto: "meadow" },
    ]);
    expect(byLabel["cave"].options[1]).toEqual({ text: "Retreat", goto: "start" });
  });

  it("treats a card with no options as a basic leaf", () => {
    const deck = parseDeck(md);
    const meadow = deck.cards.find((c) => c.label === "meadow")!;
    expect(meadow.type).toBe("basic");
    expect(meadow.back).toBe("You rest here.");
    expect(meadow.options).toEqual([]);
  });

  it("supports the end target", () => {
    const deck = parseDeck(`# T\n\n**1. Stop?**\n- Yes -> end\n`);
    expect(deck.cards[0].options).toEqual([{ text: "Yes", goto: "end" }]);
  });

  it("is backward compatible with non-branching decks", () => {
    const deck = parseDeck(`# Plain\n\n**1. Q**\nAn answer.\n`);
    expect(deck.cards[0]).toMatchObject({
      type: "basic", front: "Q", back: "An answer.", label: null, options: [],
    });
  });

  // Regression (SEO-001): the option matcher must be linear. The old regex
  // /^-\s+(.+?)\s+->\s+(\S+)\s*$/ backtracked catastrophically on a long run of
  // whitespace, blocking the server's event loop for minutes on a single import.
  it("treats an option line with no text before -> as plain back text", () => {
    // "- -> x" has an empty option label; it is not a valid option (matches the
    // original regex), so the card stays basic and the line is back text.
    const deck = parseDeck(`# T\n\n**1. q**\n- -> x\n`);
    expect(deck.cards[0].type).toBe("basic");
    expect(deck.cards[0].options).toEqual([]);
  });

  it("parses an adversarial whitespace option line in linear time", () => {
    const evil = `# T\n\n**1. q**\n- ${" ".repeat(50000)}->\n`;
    const started = Date.now();
    const deck = parseDeck(evil);
    expect(Date.now() - started).toBeLessThan(1000);
    expect(deck.cards[0].options).toEqual([]); // not a valid option line
  });
});
