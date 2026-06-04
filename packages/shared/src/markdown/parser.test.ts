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
