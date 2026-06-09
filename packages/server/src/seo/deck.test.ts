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
    expect(m.canonical).toBe(
      `https://flashkarte.christopherrehm.de/d/spanish-basics-${P.id}`,
    );
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
