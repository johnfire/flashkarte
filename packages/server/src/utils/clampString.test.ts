import { clampString } from "./clampString";

describe("clampString", () => {
  test("returns undefined for non-strings", () => {
    expect(clampString(123, 10)).toBeUndefined();
    expect(clampString(null, 10)).toBeUndefined();
    expect(clampString(undefined, 10)).toBeUndefined();
  });

  test("returns undefined when blank after trimming", () => {
    expect(clampString("", 10)).toBeUndefined();
    expect(clampString("   ", 10)).toBeUndefined();
  });

  test("trims then truncates to max", () => {
    expect(clampString("  hi  ", 10)).toBe("hi");
    expect(clampString("abcdef", 3)).toBe("abc");
    expect(clampString("  abcdef  ", 3)).toBe("abc");
  });
});
