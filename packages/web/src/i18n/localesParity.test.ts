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
  const enGuideKeySet = new Set(enGuideKeys);

  it("every locale has exactly the same guide keys as en", () => {
    for (const [name, loc] of Object.entries(locales)) {
      const locKeys = keysOf(
        (loc.guide ?? {}) as Record<string, unknown>,
        "guide.",
      );
      const locKeySet = new Set(locKeys);
      const missing = enGuideKeys.filter((k) => !locKeySet.has(k));
      const extra = locKeys.filter((k) => !enGuideKeySet.has(k));
      expect(missing, `${name} missing: ${missing.join(", ")}`).toEqual([]);
      expect(
        extra,
        `${name} has extra keys not in en: ${extra.join(", ")}`,
      ).toEqual([]);
    }
  });

  it("every locale has a non-empty common.guide string", () => {
    for (const [name, loc] of Object.entries(locales)) {
      const val = (loc.common as Record<string, unknown>)?.guide;
      expect(
        typeof val === "string" && val.length > 0,
        `${name} missing common.guide`,
      ).toBe(true);
    }
  });
});
