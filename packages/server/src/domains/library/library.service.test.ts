jest.mock("./library.repository");
// Keep rowToParsedCard real (it reconstructs cards from rows); only stub the
// DB-writing createDeckWithCards.
jest.mock("../decks/decks.repository", () => {
  const actual = jest.requireActual("../decks/decks.repository");
  return { ...actual, createDeckWithCards: jest.fn() };
});

import * as repo from "./library.repository";
import * as decksRepo from "../decks/decks.repository";
import { clone, list } from "./library.service";
import { MAX_CARDS_PER_DECK } from "../decks/decks.service";

const mockRepo = repo as jest.Mocked<typeof repo>;
const mockDecks = decksRepo as jest.Mocked<typeof decksRepo>;

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.getPublicDeck.mockResolvedValue({
    id: "src",
    title: "Source",
    author: "Chris",
    card_count: "1",
    published_at: "2026-06-05T00:00:00.000Z",
  } as never);
  mockDecks.createDeckWithCards.mockResolvedValue({
    id: "new1",
    title: "Source",
  } as never);
});

describe("library.list input normalization", () => {
  test.each([
    ["  biology  ", "biology"],
    ["   ", null],
    [42, null],
  ])("normalizes list search %p", async (searchInput, expectedSearch) => {
    mockRepo.listPublic.mockResolvedValue([]);

    await list(searchInput);

    expect(mockRepo.listPublic).toHaveBeenCalledWith(expectedSearch);
  });
});

describe("library.clone validation (matches importDeck)", () => {
  test("clones a valid deck", async () => {
    mockRepo.getPublicCards.mockResolvedValue([
      { type: "basic", content: { front: "AI", back: "def" }, category: null },
    ] as never);
    const res = await clone("u1", "src");
    expect(res).toEqual({
      deck: { id: "new1", title: "Source", card_count: 1 },
      sourceId: "src",
    });
    expect(mockDecks.createDeckWithCards).toHaveBeenCalledTimes(1);
  });

  test("rejects a source deck whose branching graph is invalid", async () => {
    // A branch option pointing at a label that does not exist must not be
    // silently copied into the caller's account.
    mockRepo.getPublicCards.mockResolvedValue([
      {
        type: "branch",
        content: {
          label: "start",
          prompt: "Fork?",
          options: [{ text: "left", goto: "missing" }],
        },
        category: null,
      },
    ] as never);
    await expect(clone("u1", "src")).rejects.toThrow(/unknown card/i);
    expect(mockDecks.createDeckWithCards).not.toHaveBeenCalled();
  });

  test("rejects a source deck exceeding the card cap", async () => {
    const tooMany = Array.from({ length: MAX_CARDS_PER_DECK + 1 }, () => ({
      type: "basic",
      content: { front: "f", back: "b" },
      category: null,
    }));
    mockRepo.getPublicCards.mockResolvedValue(tooMany as never);
    await expect(clone("u1", "src")).rejects.toThrow(/at most/i);
    expect(mockDecks.createDeckWithCards).not.toHaveBeenCalled();
  });
});
