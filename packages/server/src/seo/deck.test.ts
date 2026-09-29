import { deckMeta, deckBodyHtml, DeckPreview } from "./deck";

const P: DeckPreview = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  title: "Spanish Basics",
  author: "Chris",
  cardCount: 2,
  publishedAt: null,
  cards: [
    { front: "hola", category: null },
    { front: "<b>adiós</b>", category: "greetings" },
  ],
};

describe("deckMeta", () => {
  it("builds canonical from deckPath and a synthesized description", () => {
    const m = deckMeta(P);
    expect(m.canonical).toBe(`https://learnwohl.app/d/spanish-basics-${P.id}`);
    expect(m.title).toContain("Spanish Basics");
    expect(m.description).toContain("2 flashcards");
    expect(m.description).toContain("hola");
    expect(m.jsonLd).toMatchObject({ "@type": "LearningResource" });
  });
});

describe("deckBodyHtml", () => {
  it("renders an escaped h1 + question list, never an answer field", () => {
    const html = deckBodyHtml(P);
    expect(html).toContain("Spanish Basics");
    expect(html).toContain("hola");
    expect(html).toContain("&lt;b&gt;adiós&lt;/b&gt;"); // escaped, not raw markup
    expect(html).not.toContain("<b>adiós</b>");
  });
});

describe("deckMeta branding and punctuation", () => {
  it("names the site LearnWohl in the title, not the old product name", () => {
    const m = deckMeta(P);
    expect(m.title).toBe("Spanish Basics — flashcards by Chris | LearnWohl");
    expect(m.og.title).toBe(m.title);
    expect(JSON.stringify(m)).not.toContain("flashkarte");
  });
  it("does not double the full stop after an author who ends in one", () => {
    const m = deckMeta({ ...P, author: "Chris R." });
    expect(m.description).toContain("2 flashcards by Chris R. Includes:");
    expect(m.description).not.toContain("..");
  });
  it("still ends the sentence when the author has no full stop or there are no samples", () => {
    expect(deckMeta({ ...P, cards: [] }).description).toBe(
      "2 flashcards by Chris.",
    );
    expect(deckMeta(P).description).toContain(
      "2 flashcards by Chris. Includes:",
    );
  });
});
