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

function valueAt(loc: Record<string, unknown>, dottedKey: string): unknown {
  return dottedKey
    .split(".")
    .reduce<unknown>(
      (o, part) => (o as Record<string, unknown> | undefined)?.[part],
      loc,
    );
}

describe("locale i18n parity", () => {
  const enKeys = keysOf(en as Record<string, unknown>);
  const enKeySet = new Set(enKeys);

  it("every locale has exactly the same keys as en (whole file)", () => {
    for (const [name, loc] of Object.entries(locales)) {
      const locKeys = keysOf(loc);
      const locKeySet = new Set(locKeys);
      const missing = enKeys.filter((k) => !locKeySet.has(k));
      const extra = locKeys.filter((k) => !enKeySet.has(k));
      expect(missing, `${name} missing: ${missing.join(", ")}`).toEqual([]);
      expect(
        extra,
        `${name} has extra keys not in en: ${extra.join(", ")}`,
      ).toEqual([]);
    }
  });

  it("no locale has an empty string value", () => {
    for (const [name, loc] of Object.entries({ en, ...locales })) {
      const empties = keysOf(loc as Record<string, unknown>).filter((k) => {
        const val = valueAt(loc as Record<string, unknown>, k);
        return typeof val === "string" && val.trim() === "";
      });
      expect(
        empties,
        `${name} has empty values: ${empties.join(", ")}`,
      ).toEqual([]);
    }
  });
});
