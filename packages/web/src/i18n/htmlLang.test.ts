import { describe, it, expect } from "vitest";
import i18n from "./index";

// a11y/SEO: the <html lang> attribute must track the active language so screen
// readers and translation tools don't treat e.g. German content as English.
describe("html lang sync", () => {
  it("sets document.documentElement.lang to the active language", async () => {
    await i18n.changeLanguage("de");
    expect(document.documentElement.lang).toBe("de");
    await i18n.changeLanguage("fr");
    expect(document.documentElement.lang).toBe("fr");
  });

  it("uses the language-only subtag", async () => {
    await i18n.changeLanguage("en-US");
    expect(document.documentElement.lang).toBe("en");
  });
});
