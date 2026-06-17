import { describe, test, expect } from "vitest";
import { safeNext } from "./AuthPage";

describe("safeNext (open-redirect guard)", () => {
  test("returns a same-origin absolute path unchanged", () => {
    expect(safeNext("/d/spanish-basics")).toBe("/d/spanish-basics");
    expect(safeNext("/library")).toBe("/library");
  });

  test("falls back to / for missing or relative targets", () => {
    expect(safeNext(null)).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext("decks")).toBe("/");
  });

  test("rejects protocol-relative and scheme targets (open redirect)", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
  });
});
