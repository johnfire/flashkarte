jest.mock("./decks.repository");

import * as repository from "./decks.repository";
import { appendCards, importDeck, update } from "./decks.service";

const mockedRepository = repository as jest.Mocked<typeof repository>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedRepository.getDeck.mockResolvedValue({
    id: "deck-1",
    title: "Existing deck",
  } as never);
});

describe("deck input validation", () => {
  test.each([undefined, 42, "   "])(
    "rejects invalid import markdown %p",
    async (markdown) => {
      await expect(importDeck("user-1", markdown)).rejects.toThrow(
        "Markdown content is required",
      );
      expect(mockedRepository.createDeckWithCards).not.toHaveBeenCalled();
    },
  );

  test("rejects blank append markdown before reading the deck", async () => {
    await expect(appendCards("user-1", "deck-1", "  ")).rejects.toThrow(
      "Markdown content is required",
    );
    expect(mockedRepository.getDeck).not.toHaveBeenCalled();
  });

  test.each([
    [{ title: " " }, "Title is required"],
    [{ isPublic: "yes" }, "isPublic must be a boolean"],
    [{ isOrdered: 1 }, "isOrdered must be a boolean"],
  ])("rejects invalid update %p", async (patch, message) => {
    await expect(update("user-1", "deck-1", patch)).rejects.toThrow(message);
    expect(mockedRepository.renameDeck).not.toHaveBeenCalled();
    expect(mockedRepository.setDeckPublic).not.toHaveBeenCalled();
    expect(mockedRepository.setDeckOrdered).not.toHaveBeenCalled();
  });

  test("normalizes and applies a valid update", async () => {
    mockedRepository.renameDeck.mockResolvedValue({
      id: "deck-1",
      title: "Renamed deck",
    } as never);

    await update("user-1", "deck-1", { title: "  Renamed deck  " });

    expect(mockedRepository.renameDeck).toHaveBeenCalledWith(
      "user-1",
      "deck-1",
      "Renamed deck",
    );
  });
});
