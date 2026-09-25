import { buildLlmsTxt } from "./llms";

const site = {
  origin: "https://fk.test",
  mcpUrl: "https://mcp.fk.test/mcp",
  decks: [
    {
      title: "Spanish [Basics]\nPart 1",
      author: "Chris",
      cardCount: 12,
      path: "/d/spanish-basics-1",
    },
    { title: "One", author: "Ana", cardCount: 1, path: "/d/one-2" },
  ],
};

describe("buildLlmsTxt", () => {
  const text = buildLlmsTxt(site);

  it("starts with the llms.txt title and summary", () => {
    expect(text.startsWith("# flashkarte\n\n> ")).toBe(true);
  });

  it("explains the MCP connection and where clients register", () => {
    expect(text).toContain("`https://mcp.fk.test/mcp`");
    expect(text).toContain("`https://mcp.fk.test/oauth/register`");
    expect(text).toContain("2FA code");
    expect(text).toContain("An agent should ask its person to sign up");
  });

  it("lists public decks with absolute links, kept to one line each", () => {
    expect(text).toContain(
      "- [Spanish (Basics) Part 1](https://fk.test/d/spanish-basics-1): 12 cards, by Chris",
    );
    expect(text).toContain("- [One](https://fk.test/d/one-2): 1 card, by Ana");
  });

  it("omits the deck section when nothing is public", () => {
    const empty = buildLlmsTxt({ ...site, decks: [] });
    expect(empty).not.toContain("## Public decks");
    expect(empty).toContain("## Optional");
  });
});
