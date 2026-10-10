import { ValidationError } from "../../utils/errors";
import {
  parseDeckCsv,
  parseFlashcardCourseTables,
} from "./flashcard-import-parser";

describe("parseDeckCsv", () => {
  test("creates cards and keeps an optional deeper explanation", () => {
    const deck = parseDeckCsv(
      Buffer.from(
        "front,answer,explanation\nBonjour,Hello,An informal greeting\nMerci,Thank you,\n",
      ),
      "French basics",
    );

    expect(deck.title).toBe("French basics");
    expect(deck.cards).toHaveLength(2);
    expect(deck.cards[0].back).toBe("Hello\n\nAn informal greeting");
    expect(deck.cards[1].back).toBe("Thank you");
  });

  test("names the missing required CSV column", () => {
    expect(() =>
      parseDeckCsv(Buffer.from("front\nBonjour\n"), "French"),
    ).toThrow(new ValidationError("Deck CSV is missing: answer"));
  });
});

describe("parseFlashcardCourseTables", () => {
  test("builds an ordered course from its three tables", () => {
    const course = parseFlashcardCourseTables([
      {
        name: "Course",
        rows: [
          ["course_title", "description"],
          ["French A1", "Essential French"],
        ],
      },
      {
        name: "Decks",
        rows: [
          ["deck_key", "title", "order"],
          ["cafe", "At the cafe", "2"],
          ["greetings", "Greetings", "1"],
        ],
      },
      {
        name: "Cards",
        rows: [
          ["deck_key", "front", "answer", "explanation"],
          ["greetings", "Bonjour", "Hello", "A greeting"],
          ["cafe", "L'addition", "The bill", ""],
        ],
      },
    ]);

    expect(course.title).toBe("French A1");
    expect(course.decks.map((deck) => deck.title)).toEqual([
      "Greetings",
      "At the cafe",
    ]);
    expect(course.decks[0].cards[0].back).toBe("Hello\n\nA greeting");
  });

  test("identifies a card that references an unknown deck", () => {
    expect(() =>
      parseFlashcardCourseTables([
        {
          name: "Course",
          rows: [
            ["course_title", "description"],
            ["French", ""],
          ],
        },
        {
          name: "Decks",
          rows: [
            ["deck_key", "title", "order"],
            ["greetings", "Greetings", "1"],
          ],
        },
        {
          name: "Cards",
          rows: [
            ["deck_key", "front", "answer"],
            ["unknown", "Bonjour", "Hello"],
          ],
        },
      ]),
    ).toThrow(new ValidationError("Cards, row 2: unknown deck_key unknown"));
  });
});
