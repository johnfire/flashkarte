import { describe, it, expect } from "vitest";
import en from "./locales/en.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

const locales = { de, es, fr } as Record<string, Record<string, unknown>>;

function keysOf(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("guide i18n parity", () => {
  const enGuideKeys = keysOf(en.guide as Record<string, unknown>, "guide.");

  it("every locale has all guide keys", () => {
    for (const [name, loc] of Object.entries(locales)) {
      const locKeys = new Set(
        keysOf((loc.guide ?? {}) as Record<string, unknown>, "guide."),
      );
      const missing = enGuideKeys.filter((k) => !locKeys.has(k));
      expect(missing, `${name} missing: ${missing.join(", ")}`).toEqual([]);
    }
  });

  it("every locale has common.guide", () => {
    for (const [name, loc] of Object.entries(locales)) {
      expect(
        (loc.common as Record<string, unknown>)?.guide,
        `${name} missing common.guide`,
      ).toBeTruthy();
    }
  });
});
