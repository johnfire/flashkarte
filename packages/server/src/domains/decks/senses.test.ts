import { validateSenses } from "./senses";
import { parseDeck, type ParsedCard } from "@flashkarte/shared";

const block = (front: string, senses: string[]) =>
  parseDeck(`# D\n\n**1. ${front}**\n${senses.join("\n")}\n`).cards;

const plain = (front: string): ParsedCard => ({
  type: "basic",
  front,
  back: "b",
  category: null,
  label: null,
  options: [],
  sense: null,
  senseConflict: false,
});

describe("validateSenses", () => {
  test("a well-formed word block passes", () => {
    const cards = block("der Zug", [
      "- train | ctx | hint",
      "- move | ctx2 | h2",
    ]);
    expect(cards).toHaveLength(2);
    expect(() => validateSenses(cards)).not.toThrow();
  });

  test("decks without sense cards are untouched", () => {
    expect(() => validateSenses([plain("a"), plain("b")])).not.toThrow();
  });

  test("a card mixing sense lines with routed options is rejected by name", () => {
    const cards = parseDeck(
      `# D\n\n**1. der Zug**\n- train | ctx | hint\n- move | c2 | h2\n- Right -> correct\n`,
    ).cards;
    expect(cards[0].senseConflict).toBe(true);
    expect(() => validateSenses(cards)).toThrow(/der Zug/);
  });

  test("a headword split across two blocks is rejected", () => {
    // The two blocks slug to one `word` key and would merge into a single word
    // whose cards disagree about how many senses it has.
    const cards = [
      ...block("der Zug", ["- train | c | h", "- move | c | h"]),
      ...block("der Zug", ["- draught | c | h", "- procession | c | h"]),
    ];
    expect(() => validateSenses(cards)).toThrow(/more than one block/);
  });

  test("equal-sized split blocks are still caught", () => {
    // Regression: comparing the blocks' own counts to each other passes here,
    // because both say 2 — the count must be checked against reality.
    const cards = [
      ...block("die Bank", ["- bench | c | h", "- bank | c | h"]),
      ...block("die Bank", ["- bench2 | c | h", "- bank2 | c | h"]),
    ];
    const counts = cards.map((c) => c.sense?.count);
    expect(new Set(counts).size).toBe(1);
    expect(() => validateSenses(cards)).toThrow(/die Bank/);
  });

  test("appending a block for a headword already in the deck is rejected", () => {
    const cards = block("der Zug", ["- train | c | h", "- move | c | h"]);
    expect(() => validateSenses(cards, new Set(["der-zug"]))).toThrow(
      /more than one block/,
    );
  });

  test("appending an unrelated word to a deck with senses is fine", () => {
    const cards = block("die Bank", ["- bench | c | h", "- bank | c | h"]);
    expect(() => validateSenses(cards, new Set(["der-zug"]))).not.toThrow();
  });
});
