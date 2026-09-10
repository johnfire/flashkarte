import { STABLE_REPS, wordPhase, promptFor, PromptCard } from "./senses";
import { CardSense } from "../markdown/parser";

const sense = (over: Partial<CardSense> = {}): CardSense => ({
  context: "Der Zug fährt um 8 Uhr ab.",
  hint: "Eisenbahn",
  word: "der-zug",
  index: 0,
  count: 3,
  ...over,
});

const card = (s: CardSense | null): PromptCard => ({
  front: "der Zug",
  sense: s,
});

describe("wordPhase", () => {
  test("splits only when every sense is stable", () => {
    const stable = { repetitions: STABLE_REPS };
    expect(wordPhase([stable, stable, stable])).toBe("split");
    expect(wordPhase([stable, stable, { repetitions: 2 }])).toBe("chain");
  });

  test("the boundary is at STABLE_REPS, not above it", () => {
    expect(wordPhase([{ repetitions: STABLE_REPS - 1 }])).toBe("chain");
    expect(wordPhase([{ repetitions: STABLE_REPS }])).toBe("split");
  });

  test("a lapse on one sense re-chains the whole word", () => {
    // repetitions resets to 0 on Again, so graduation is reversible by design.
    expect(wordPhase([{ repetitions: 9 }, { repetitions: 0 }])).toBe("chain");
  });

  test("a word with no progress rows yet is chained", () => {
    expect(wordPhase([])).toBe("chain");
  });
});

describe("promptFor", () => {
  test("chain hands the sense over via the hint", () => {
    expect(promptFor(card(sense()), "chain")).toBe("der Zug — Eisenbahn?");
  });

  test("chain falls back to position when no hint was authored", () => {
    expect(promptFor(card(sense({ hint: null, index: 1 })), "chain")).toBe(
      "der Zug — meaning 2 of 3",
    );
  });

  test("split asks with the context sentence", () => {
    expect(promptFor(card(sense()), "split")).toBe(
      "Der Zug fährt um 8 Uhr ab.",
    );
  });

  test("split falls back to the headword when no context was authored", () => {
    expect(promptFor(card(sense({ context: null })), "split")).toBe("der Zug");
  });

  test("an ordinary card renders its front in either phase", () => {
    expect(promptFor(card(null), "chain")).toBe("der Zug");
    expect(promptFor(card(null), "split")).toBe("der Zug");
  });
});
