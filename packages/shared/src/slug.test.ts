import { slugify, extractDeckId, deckSlug, deckPath } from "./slug";

const ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

describe("slugify", () => {
  it("lowercases, strips accents, hyphenates", () => {
    expect(slugify("Español Básico!")).toBe("espanol-basico");
  });
  it("collapses separators and trims", () => {
    expect(slugify("  a — b  ")).toBe("a-b");
  });
  it("falls back to 'deck' for empty/symbol-only titles", () => {
    expect(slugify("???")).toBe("deck");
    expect(slugify("")).toBe("deck");
  });
  it("caps length and has no trailing hyphen", () => {
    const s = slugify("x".repeat(200));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("extractDeckId", () => {
  it("pulls the trailing UUID", () => {
    expect(extractDeckId(`spanish-basics-${ID}`)).toBe(ID);
  });
  it("is case-insensitive and returns lowercase", () => {
    expect(extractDeckId(`x-${ID.toUpperCase()}`)).toBe(ID);
  });
  it("returns null when no trailing UUID", () => {
    expect(extractDeckId("just-a-slug")).toBeNull();
  });
});

describe("deckSlug / deckPath", () => {
  it("composes slug + id and the /d/ path", () => {
    expect(deckSlug("Spanish Basics", ID)).toBe(`spanish-basics-${ID}`);
    expect(deckPath("Spanish Basics", ID)).toBe(`/d/spanish-basics-${ID}`);
  });
  it("round-trips through extractDeckId", () => {
    expect(extractDeckId(deckSlug("Any Title!", ID))).toBe(ID);
  });
});
