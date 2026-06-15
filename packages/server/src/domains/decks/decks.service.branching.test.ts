jest.mock("./decks.repository");
import * as repo from "./decks.repository";
import { importDeck } from "./decks.service";

const mock = repo as jest.Mocked<typeof repo>;

beforeEach(() => {
  jest.clearAllMocks();
  mock.createDeckWithCards.mockResolvedValue({ id: "d1", title: "T" } as never);
});

it("rejects a deck whose option points nowhere", async () => {
  const md = `# T\n\n**1. Pick**\n- Go -> ghost\n`;
  await expect(importDeck("u1", md, "t.md")).rejects.toThrow(/ghost/);
  expect(mock.createDeckWithCards).not.toHaveBeenCalled();
});

it("imports a valid branch deck and stores branch + leaf cards", async () => {
  const md = `# T\n\n[start]\n**1. Pick**\n- Go -> leaf\n\n[leaf]\n**2. Done**\nbye\n`;
  await importDeck("u1", md, "t.md");
  const cards = mock.createDeckWithCards.mock.calls[0][3];
  expect(cards[0]).toMatchObject({ type: "branch", label: "start" });
  expect(cards[1]).toMatchObject({ type: "basic", label: "leaf", back: "bye" });
});

it("rejects a deck that exceeds the card cap before any write", async () => {
  const { MAX_CARDS_PER_DECK } = await import("./decks.service");
  const cards = Array.from(
    { length: MAX_CARDS_PER_DECK + 1 },
    (_, i) => `**${i + 1}. Q${i}**\nA${i}`,
  ).join("\n\n");
  const md = `# T\n\n${cards}\n`;
  await expect(importDeck("u1", md, "t.md")).rejects.toThrow(/at most/);
  expect(mock.createDeckWithCards).not.toHaveBeenCalled();
});
