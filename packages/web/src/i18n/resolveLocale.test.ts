import { describe, it, expect } from "vitest";
import { resolveLocale, SUPPORTED_LOCALES } from "./resolveLocale";

describe("resolveLocale", () => {
  it("resolves every supported locale to itself", () => {
    for (const locale of SUPPORTED_LOCALES) {
      expect(resolveLocale(locale)).toBe(locale);
    }
  });
  it("returns an exact supported tag unchanged", () => {
    expect(resolveLocale("de")).toBe("de");
  });
  it("strips region subtags (de-AT -> de)", () => {
    expect(resolveLocale("de-AT")).toBe("de");
    expect(resolveLocale("fr-CA")).toBe("fr");
  });
  it("is case-insensitive", () => {
    expect(resolveLocale("ES")).toBe("es");
  });
  it("falls back to en for unsupported or empty input", () => {
    expect(resolveLocale("ja")).toBe("en");
    expect(resolveLocale("")).toBe("en");
    expect(resolveLocale(null)).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
  });
});
