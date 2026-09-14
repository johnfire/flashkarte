import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { updateCard, reorderSenses } from "./decks.service";
import { NotFoundError, ValidationError } from "../../utils/errors";

const OWNER_ID = "10000000-0000-4000-8000-0000000000f1";
const OUTSIDER_ID = "10000000-0000-4000-8000-0000000000f2";
const DECK_ID = "20000000-0000-4000-8000-0000000000f1";
const BASIC_CARD_ID = "30000000-0000-4000-8000-0000000000f1";
const BRANCH_A_ID = "30000000-0000-4000-8000-0000000000f2";
const BRANCH_B_ID = "30000000-0000-4000-8000-0000000000f3";
const SENSE_A_ID = "30000000-0000-4000-8000-0000000000f4";
const SENSE_B_ID = "30000000-0000-4000-8000-0000000000f5";

function assertSafeIntegrationDatabase(): void {
  const databaseName = process.env.POSTGRES_DB ?? "";
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Card-edit integration tests require POSTGRES_DB ending in _test",
    );
  }
}

async function resetFixtures(): Promise<void> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES
       ($1, 'card-edit-owner@example.com', 'x'),
       ($2, 'card-edit-outsider@example.com', 'x')`,
    [OWNER_ID, OUTSIDER_ID],
  );
  await pool.query(
    `INSERT INTO decks (id, user_id, title) VALUES ($1, $2, 'Edit Test Deck')`,
    [DECK_ID, OWNER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, type, content, position) VALUES
       ($1, $6, $5, 'basic', '{"front":"Q","back":"A"}'::jsonb, 0),
       ($2, $6, $5, 'branch',
         '{"label":"a","prompt":"Start","options":[{"text":"Go","goto":"b"}]}'::jsonb, 1),
       ($3, $6, $5, 'branch',
         '{"label":"b","prompt":"End","options":[{"text":"Done","goto":"end"}]}'::jsonb, 2),
       ($4, $6, $5, 'basic',
         '{"front":"der Zug","back":"train","sense":{"word":"der Zug","index":0,"count":2,"context":"c1","hint":null}}'::jsonb, 3),
       ($7, $6, $5, 'basic',
         '{"front":"der Zug","back":"move","sense":{"word":"der Zug","index":1,"count":2,"context":"c2","hint":null}}'::jsonb, 4)`,
    [
      BASIC_CARD_ID,
      BRANCH_A_ID,
      BRANCH_B_ID,
      SENSE_A_ID,
      DECK_ID,
      OWNER_ID,
      SENSE_B_ID,
    ],
  );
}

beforeAll(async () => {
  assertSafeIntegrationDatabase();
  await runMigrations();
});

beforeEach(resetFixtures);

afterAll(async () => {
  await closePool();
});

describe("updateCard", () => {
  test("edits a basic card's back and persists it", async () => {
    const updated = await updateCard(OWNER_ID, DECK_ID, BASIC_CARD_ID, {
      back: "A2",
    });
    expect(updated.content.back).toBe("A2");

    const row = await getPool().query(
      "SELECT content->>'back' AS back FROM cards WHERE id = $1",
      [BASIC_CARD_ID],
    );
    expect(row.rows[0].back).toBe("A2");
  });

  test("rejects retargeting a branch option to a label that doesn't exist", async () => {
    await expect(
      updateCard(OWNER_ID, DECK_ID, BRANCH_A_ID, {
        options: [{ text: "Go", goto: "nowhere" }],
      }),
    ).rejects.toThrow(ValidationError);

    // The write was rejected before touching the row.
    const row = await getPool().query(
      "SELECT content->'options'->0->>'goto' AS goto FROM cards WHERE id = $1",
      [BRANCH_A_ID],
    );
    expect(row.rows[0].goto).toBe("b");
  });

  test("accepts retargeting a branch option to a real label", async () => {
    const updated = await updateCard(OWNER_ID, DECK_ID, BRANCH_B_ID, {
      options: [{ text: "Back to start", goto: "a" }],
    });
    expect((updated.content.options as unknown[])[0]).toEqual({
      text: "Back to start",
      goto: "a",
    });
  });

  test("rejects editing a sense card's word in a way that would desync the chain", async () => {
    await expect(
      updateCard(OWNER_ID, DECK_ID, SENSE_A_ID, {
        sense: { word: "a different word" },
      }),
    ).rejects.toThrow(ValidationError);
  });

  test("edits a sense card's context/hint text freely", async () => {
    const updated = await updateCard(OWNER_ID, DECK_ID, SENSE_A_ID, {
      sense: { context: "updated context" },
    });
    expect(updated.content.sense).toMatchObject({
      word: "der Zug",
      context: "updated context",
      index: 0,
      count: 2,
    });
  });

  test("an outsider can't edit someone else's card", async () => {
    await expect(
      updateCard(OUTSIDER_ID, DECK_ID, BASIC_CARD_ID, { back: "hijacked" }),
    ).rejects.toThrow(NotFoundError);

    const row = await getPool().query(
      "SELECT content->>'back' AS back FROM cards WHERE id = $1",
      [BASIC_CARD_ID],
    );
    expect(row.rows[0].back).toBe("A");
  });
});

describe("reorderSenses", () => {
  test("atomically rewrites index/count for every sibling in the new order", async () => {
    await reorderSenses(OWNER_ID, DECK_ID, "der Zug", [SENSE_B_ID, SENSE_A_ID]);

    const rows = await getPool().query(
      "SELECT id, content->'sense'->>'index' AS idx, content->'sense'->>'count' AS count FROM cards WHERE id = ANY($1) ORDER BY id",
      [[SENSE_A_ID, SENSE_B_ID]],
    );
    const byId = Object.fromEntries(rows.rows.map((r) => [r.id, r]));
    expect(byId[SENSE_B_ID].idx).toBe("0");
    expect(byId[SENSE_A_ID].idx).toBe("1");
    expect(byId[SENSE_A_ID].count).toBe("2");
    expect(byId[SENSE_B_ID].count).toBe("2");
  });

  test("rejects a reorder list that doesn't match the word's exact sibling set", async () => {
    await expect(
      reorderSenses(OWNER_ID, DECK_ID, "der Zug", [SENSE_A_ID]),
    ).rejects.toThrow(ValidationError);
  });

  test("rejects a reorder list containing a card from outside the word", async () => {
    await expect(
      reorderSenses(OWNER_ID, DECK_ID, "der Zug", [
        SENSE_A_ID,
        SENSE_B_ID,
        BASIC_CARD_ID,
      ]),
    ).rejects.toThrow(ValidationError);
  });
});
