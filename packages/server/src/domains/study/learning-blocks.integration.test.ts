import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { getStudyBatch, stats } from "./study.service";

const USER_ID = "10000000-0000-4000-8000-0000000000b1";
const DECK_ID = "20000000-0000-4000-8000-0000000000b1";
const CARD_COUNT = 90;

const cardId = (index: number) =>
  `30000000-0000-4000-8000-${index.toString().padStart(12, "0")}`;
const LESSON_ID = "30000000-0000-4000-8000-0000000009ff";

function assertSafeIntegrationDatabase(): void {
  const databaseName = process.env.POSTGRES_DB ?? "";
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Learning-block integration tests require POSTGRES_DB ending in _test",
    );
  }
}

async function resetFixtures(): Promise<void> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash)
     VALUES ($1, 'learning-blocks@example.com', 'not-used')`,
    [USER_ID],
  );
  await pool.query(
    "INSERT INTO decks (id, user_id, title) VALUES ($1, $2, 'Vocabulary')",
    [DECK_ID, USER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, content, position)
     SELECT ('30000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, $1, $2,
            jsonb_build_object('front', 'w' || i, 'back', 'm' || i), i
     FROM generate_series(0, $3::int - 1) AS i`,
    [USER_ID, DECK_ID, CARD_COUNT],
  );
}

/** Give cards [from, to) a progress row that is NOT due, with the given last rating. */
async function rate(from: number, to: number, lastRating: number) {
  const ids = Array.from({ length: to - from }, (_, i) => cardId(from + i));
  await getPool().query(
    `INSERT INTO card_progress (user_id, card_id, repetitions, interval_days, due_at, last_rating)
     SELECT $1, id, 1, 7, now() + interval '7 days', $3
     FROM unnest($2::uuid[]) AS id
     ON CONFLICT (user_id, card_id) DO UPDATE SET last_rating = EXCLUDED.last_rating`,
    [USER_ID, ids, lastRating],
  );
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from }, (_, i) => cardId(from + i));

beforeAll(async () => {
  assertSafeIntegrationDatabase();
  await runMigrations();
});

beforeEach(resetFixtures);

afterAll(async () => {
  await closePool();
});

describe("learning blocks in the study queue", () => {
  test("a fresh 90-card deck introduces only its first 40 cards", async () => {
    const batch = await getStudyBatch(USER_ID, DECK_ID, 100);
    expect(batch.map((c) => c.id)).toEqual(range(0, 40));
  });

  test("the next 40 open once every card of block 1 was last rated Perfect", async () => {
    await rate(0, 40, 5);
    const batch = await getStudyBatch(USER_ID, DECK_ID, 100);
    expect(batch.map((c) => c.id)).toEqual(range(40, 80));
  });

  test("one card short of Perfect keeps the next block closed", async () => {
    await rate(0, 40, 5);
    await rate(17, 18, 4);
    const batch = await getStudyBatch(USER_ID, DECK_ID, 100);
    // Nothing due and nothing admissible: random practice, drawn only from block 1.
    expect(batch.length).toBe(40);
    expect(new Set(batch.map((c) => c.id))).toEqual(new Set(range(0, 40)));
  });

  test("reviews that are due are always served, whatever their block", async () => {
    await rate(0, 50, 3);
    await getPool().query(
      `UPDATE card_progress SET due_at = now() - interval '1 hour'
       WHERE user_id = $1 AND card_id = $2`,
      [USER_ID, cardId(45)],
    );
    const batch = await getStudyBatch(USER_ID, DECK_ID, 100);
    expect(batch.map((c) => c.id)).toEqual([cardId(45)]);
  });

  test("existing progress is untouched: no rows are written by reading the queue", async () => {
    await rate(0, 10, 4);
    await getStudyBatch(USER_ID, DECK_ID, 100);
    await stats(USER_ID, DECK_ID);
    const rows = await getPool().query(
      "SELECT count(*)::int AS n FROM card_progress WHERE user_id = $1",
      [USER_ID],
    );
    expect(rows.rows[0].n).toBe(10);
  });

  test("lessons are not counted in blocks and are still offered", async () => {
    await getPool().query(
      `INSERT INTO cards (id, user_id, deck_id, type, content, position)
       VALUES ($1, $2, $3, 'read', '{"front":"Intro","back":"Read me"}', 1000)`,
      [LESSON_ID, USER_ID, DECK_ID],
    );
    await rate(0, 40, 4);
    const batch = await getStudyBatch(USER_ID, DECK_ID, 100, true);
    expect(batch.map((c) => c.id)).toEqual([LESSON_ID]);
  });

  test("deck stats report the current block", async () => {
    await rate(0, 40, 5);
    await rate(40, 52, 5);
    const deckStats = await stats(USER_ID, DECK_ID);
    expect(deckStats.learning_block).toEqual({
      block_size: 40,
      blocks_total: 3,
      current_block: 2,
      current_block_cards: 40,
      current_block_mastered: 12,
    });
    // Existing counters are unchanged in meaning.
    expect(deckStats.total).toBe(90);
    expect(deckStats.easy).toBe(52);
  });
});
