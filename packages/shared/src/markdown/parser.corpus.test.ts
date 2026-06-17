import { readFileSync } from "fs";
import { join } from "path";
import { parseDeck } from "./parser";

// Shared cross-port parity corpus (see fixtures/parser-cases.json). The Python
// reference parser must produce identical results for every case — this is the
// TS side; python/tests/unit/test_md_parser_corpus.py is the Python side.
interface Case {
  name: string;
  input: string;
  source: string;
  expected: {
    title: string;
    cards: { front: string; back: string; category: string | null }[];
  };
}

const corpus = JSON.parse(
  readFileSync(
    join(__dirname, "../../../../fixtures/parser-cases.json"),
    "utf8",
  ),
) as { cases: Case[] };

describe("parser parity corpus (shared with Python)", () => {
  for (const c of corpus.cases) {
    test(c.name, () => {
      const deck = parseDeck(c.input, c.source);
      expect(deck.title).toBe(c.expected.title);
      // Compare only the fields the Python port also produces.
      const common = deck.cards.map((card) => ({
        front: card.front,
        back: card.back,
        category: card.category,
      }));
      expect(common).toEqual(c.expected.cards);
    });
  }
});
