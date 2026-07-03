import { parseDeck, type ParsedCard } from "../markdown/parser";
import { resolveChoice, selectOptions } from "./diagnostic";

// A tiny deterministic PRNG so shuffles are stable within this suite. (Cross-port
// order is NOT asserted — TS and Kotlin RNGs differ; parity is on invariants and
// on resolveChoice, which is RNG-free. Kotlin mirror: DiagnosticStudyTest.kt.)
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const diagnostic = parseDeck(
  `# D\n\n[dx]\n**1. Pick one:**\n- Right -> correct\n- Confused -> fix\n- Nope -> end\nBack text.\n`,
).cards[0];

const plain: ParsedCard = {
  type: "basic",
  front: "Q",
  back: "Answer",
  category: null,
  label: null,
  options: [],
};

describe("resolveChoice (deterministic — TS/Kotlin parity)", () => {
  it("marks the `-> correct` option correct with rating 4, no remediation", () => {
    expect(resolveChoice(diagnostic, 0)).toEqual({
      correct: true,
      rating: 4,
      remediationLabel: null,
    });
  });

  it("routes a wrong option to its remediation label with rating 1", () => {
    expect(resolveChoice(diagnostic, 1)).toEqual({
      correct: false,
      rating: 1,
      remediationLabel: "fix",
    });
  });

  it("gives a wrong `-> end` option rating 1 with no remediation", () => {
    expect(resolveChoice(diagnostic, 2)).toEqual({
      correct: false,
      rating: 1,
      remediationLabel: null,
    });
  });

  it("treats an out-of-range index defensively as plain wrong", () => {
    expect(resolveChoice(diagnostic, 9)).toEqual({
      correct: false,
      rating: 1,
      remediationLabel: null,
    });
  });
});

describe("selectOptions", () => {
  it("returns all authored options for a diagnostic card, with stable indices", () => {
    const options = selectOptions(diagnostic, [], 4, seeded(1));
    expect(options).toHaveLength(3);
    // Set of texts is complete regardless of shuffle order.
    expect(options.map((o) => o.text).sort()).toEqual([
      "Confused",
      "Nope",
      "Right",
    ]);
    // Exactly one correct, and each option keeps its authored index + resolution.
    expect(options.filter((o) => o.correct)).toHaveLength(1);
    for (const option of options) {
      expect(diagnostic.options[option.optionIndex!].text).toBe(option.text);
      const resolution = resolveChoice(diagnostic, option.optionIndex!);
      expect(option.correct).toBe(resolution.correct);
      expect(option.remediationLabel).toBe(resolution.remediationLabel);
    }
  });

  it("builds random distractors around the back for an ordinary card", () => {
    const pool = ["Answer", "D1", "D2", "D3", "D4"];
    const options = selectOptions(plain, pool, 4, seeded(2));
    expect(options).toHaveLength(4); // correct + 3 distractors
    expect(options.filter((o) => o.correct)).toEqual([
      {
        text: "Answer",
        optionIndex: null,
        correct: true,
        remediationLabel: null,
      },
    ]);
    // Distractors are distinct, drawn from the pool, and never equal the back.
    const distractors = options.filter((o) => !o.correct).map((o) => o.text);
    expect(new Set(distractors).size).toBe(distractors.length);
    for (const text of distractors) {
      expect(pool).toContain(text);
      expect(text).not.toBe("Answer");
    }
    expect(options.every((o) => o.optionIndex === null)).toBe(true);
  });

  it("never fewer options than available, and caps at count", () => {
    const options = selectOptions(plain, ["Answer", "only"], 4, seeded(3));
    expect(options.map((o) => o.text).sort()).toEqual(["Answer", "only"]);
  });
});
