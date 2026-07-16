jest.mock("./account.repository");

import * as repo from "./account.repository";
import { exportData } from "./account.service";
import { NotFoundError } from "../../utils/errors";

const mock = repo as jest.Mocked<typeof repo>;

const profileRow: repo.ProfileRow = {
  email: "ada@example.com",
  display_name: "Ada",
  role: "user",
  account_type: "free",
  language: "en",
  email_verified_at: "2026-01-02T00:00:00Z",
  created_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  mock.findProfile.mockResolvedValue(profileRow);
  mock.findDecks.mockResolvedValue([]);
  mock.findCards.mockResolvedValue([]);
  mock.findProgress.mockResolvedValue([]);
  mock.findReviewEvents.mockResolvedValue([]);
  mock.findApiKeyMeta.mockResolvedValue([]);
});

describe("account.service exportData", () => {
  it("throws NotFoundError for an unknown user", async () => {
    mock.findProfile.mockResolvedValue(null);
    await expect(exportData("ghost")).rejects.toThrow(NotFoundError);
  });

  it("assembles profile, decks with nested cards, progress, and events", async () => {
    mock.findDecks.mockResolvedValue([
      {
        id: "d1",
        title: "Spanish",
        source_filename: "es.md",
        is_public: false,
        is_ordered: false,
        created_at: "c",
        updated_at: "u",
      },
    ]);
    mock.findCards.mockResolvedValue([
      {
        id: "c1",
        deck_id: "d1",
        type: "basic",
        content: { front: "hola", back: "hello" },
        category: null,
        position: 0,
        created_at: "c",
        updated_at: "u",
      },
    ]);
    mock.findProgress.mockResolvedValue([
      {
        card_id: "c1",
        repetitions: 3,
        ease_factor: 2.5,
        interval_days: 4,
        due_at: "due",
        last_reviewed_at: "lr",
        last_rating: 5,
      },
    ]);
    mock.findReviewEvents.mockResolvedValue([
      {
        event_id: "e1",
        card_id: "c1",
        rating: 5,
        reviewed_at: "ra",
        option_index: null,
        created_at: "c",
      },
    ]);

    const out = await exportData("u1");
    expect(out.profile.email).toBe("ada@example.com");
    expect(out.decks).toHaveLength(1);
    expect(out.decks[0].cards[0].content).toEqual({
      front: "hola",
      back: "hello",
    });
    expect(out.cardProgress[0].cardId).toBe("c1");
    expect(out.reviewEvents[0].eventId).toBe("e1");
    expect(typeof out.exportedAt).toBe("string");
  });

  it("includes API key metadata but can never leak a secret", async () => {
    mock.findApiKeyMeta.mockResolvedValue([
      {
        name: "MCP",
        key_prefix: "fk_abcd1234",
        scope: "deck",
        created_at: "c",
      },
    ]);
    const out = await exportData("u1");
    expect(out.apiKeys).toEqual([
      {
        name: "MCP",
        keyPrefix: "fk_abcd1234",
        scope: "deck",
        createdAt: "c",
      },
    ]);
    // Defense in depth: nothing shaped like a key hash or raw key anywhere.
    const serialized = JSON.stringify(out);
    expect(serialized).not.toMatch(/key_hash|keyHash/);
  });

  it("never exports the password hash", async () => {
    const out = await exportData("u1");
    expect(JSON.stringify(out)).not.toMatch(/password/i);
  });
});
