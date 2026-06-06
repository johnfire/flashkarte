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
});
