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
    [{ speechEnabled: "on" }, "speechEnabled must be a boolean"],
    [
      { speechFrontLang: "deutsch!" },
      "Language must be a BCP-47 tag such as de-DE",
    ],
    [{ speechAutoplay: "loud" }, "Autoplay must be off, front, back or both"],
    [{ speechRate: 0.1 }, "Speech rate must be between 0.5 and 2"],
  ])("rejects invalid update %p", async (patch, message) => {
    await expect(update("user-1", "deck-1", patch)).rejects.toThrow(message);
    expect(mockedRepository.renameDeck).not.toHaveBeenCalled();
    expect(mockedRepository.setDeckPublic).not.toHaveBeenCalled();
    expect(mockedRepository.setDeckOrdered).not.toHaveBeenCalled();
    expect(mockedRepository.setDeckSpeech).not.toHaveBeenCalled();
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

describe("deck speech overrides (Spec 09)", () => {
  beforeEach(() => {
    mockedRepository.setDeckSpeech.mockResolvedValue({
      id: "deck-1",
      title: "Existing deck",
    } as never);
  });

  test("passes the two languages through as separate columns", async () => {
    await update("user-1", "deck-1", {
      speechEnabled: true,
      speechFrontLang: "de-DE",
      speechBackLang: "en-GB",
    });

    expect(mockedRepository.setDeckSpeech).toHaveBeenCalledWith(
      "user-1",
      "deck-1",
      {
        speech_enabled: true,
        speech_front_lang: "de-DE",
        speech_back_lang: "en-GB",
      },
    );
  });

  test("an explicit null resets a field to inherit", async () => {
    await update("user-1", "deck-1", { speechEnabled: null });

    expect(mockedRepository.setDeckSpeech).toHaveBeenCalledWith(
      "user-1",
      "deck-1",
      { speech_enabled: null },
    );
  });

  test("false mutes the deck and is not confused with inherit", async () => {
    await update("user-1", "deck-1", { speechEnabled: false });

    expect(mockedRepository.setDeckSpeech).toHaveBeenCalledWith(
      "user-1",
      "deck-1",
      { speech_enabled: false },
    );
  });

  test("a patch with no speech fields never touches the speech columns", async () => {
    mockedRepository.setDeckPublic.mockResolvedValue({
      id: "deck-1",
    } as never);

    await update("user-1", "deck-1", { isPublic: true });

    expect(mockedRepository.setDeckSpeech).not.toHaveBeenCalled();
  });

  test("accepts a tag outside the UI locale list", async () => {
    await update("user-1", "deck-1", { speechFrontLang: "ja-JP" });

    expect(mockedRepository.setDeckSpeech).toHaveBeenCalledWith(
      "user-1",
      "deck-1",
      { speech_front_lang: "ja-JP" },
    );
  });
});
