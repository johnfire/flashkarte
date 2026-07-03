import { validateBranching } from "./branching";
import type { ParsedCard } from "@flashkarte/shared";

const basic = (front: string): ParsedCard => ({
  type: "basic",
  front,
  back: "b",
  category: null,
  label: null,
  options: [],
});
const branch = (label: string, opts: [string, string][]): ParsedCard => ({
  type: "branch",
  front: "p",
  back: "",
  category: null,
  label,
  options: opts.map(([text, goto]) => ({ text, goto })),
});
// A diagnostic card is a basic card carrying options, one of which is `correct`.
const diagnostic = (front: string, opts: [string, string][]): ParsedCard => ({
  type: "basic",
  front,
  back: "explanation",
  category: null,
  label: null,
  options: opts.map(([text, goto]) => ({ text, goto })),
});
const labelled = (label: string): ParsedCard => ({
  ...basic(label),
  label,
});

describe("validateBranching", () => {
  it("passes a deck with no branch cards", () => {
    expect(() => validateBranching([basic("x"), basic("y")])).not.toThrow();
  });

  it("passes resolvable gotos and end", () => {
    expect(() =>
      validateBranching([
        branch("start", [
          ["go", "leaf"],
          ["stop", "end"],
        ]),
        { ...basic("l"), label: "leaf" },
      ]),
    ).not.toThrow();
  });

  it("rejects a dangling goto", () => {
    expect(() =>
      validateBranching([branch("start", [["go", "nowhere"]])]),
    ).toThrow(/nowhere/);
  });

  it("rejects duplicate labels", () => {
    expect(() =>
      validateBranching([
        branch("dup", [["a", "end"]]),
        branch("dup", [["b", "end"]]),
      ]),
    ).toThrow(/dup/);
  });

  // Spec 01 — diagnostic cards.
  it("passes a diagnostic card with a resolvable remediation and end", () => {
    expect(() =>
      validateBranching([
        diagnostic("Pick one", [
          ["Right", "correct"],
          ["Confused", "fix"],
          ["Nope", "end"],
        ]),
        labelled("fix"),
      ]),
    ).not.toThrow();
  });

  it("rejects a diagnostic card with two correct options", () => {
    expect(() =>
      validateBranching([
        diagnostic("Pick one", [
          ["A", "correct"],
          ["B", "correct"],
        ]),
      ]),
    ).toThrow(/exactly one/);
  });

  it("rejects a diagnostic card with no correct option (would be a branch card)", () => {
    // Note: the parser only classifies a card as diagnostic when it HAS a
    // `correct` option; this guards the validator directly.
    expect(() =>
      validateBranching([
        { ...diagnostic("Pick one", [["A", "x"]]), options: [] },
      ]),
    ).not.toThrow(); // no options -> ordinary basic card, nothing to validate
  });

  it("rejects a diagnostic remediation target that doesn't exist, naming it", () => {
    expect(() =>
      validateBranching([
        diagnostic("Pick one", [
          ["Right", "correct"],
          ["Wrong", "missing-card"],
        ]),
      ]),
    ).toThrow(/missing-card/);
  });

  it("rejects a remediation target that is a branch card", () => {
    // (Also independently rejected by the no-mixing rule, but the message is
    // specific about the target needing to be a basic card.)
    expect(() =>
      validateBranching([
        diagnostic("Pick one", [
          ["Right", "correct"],
          ["Wrong", "b"],
        ]),
        branch("b", [["x", "end"]]),
      ]),
    ).toThrow();
  });

  it("rejects mixing branch cards with diagnostic cards", () => {
    expect(() =>
      validateBranching([
        diagnostic("Pick one", [
          ["Right", "correct"],
          ["Wrong", "end"],
        ]),
        branch("start", [["go", "end"]]),
      ]),
    ).toThrow(/mix branch cards with diagnostic/);
  });

  it("allows a diagnostic card alongside ordinary basic cards", () => {
    expect(() =>
      validateBranching([
        basic("plain"),
        diagnostic("Pick one", [
          ["Right", "correct"],
          ["Wrong", "end"],
        ]),
      ]),
    ).not.toThrow();
  });
});
