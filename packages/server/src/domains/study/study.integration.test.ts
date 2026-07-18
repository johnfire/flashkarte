import { Client } from "pg";
import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { review, sync } from "./study.service";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const DECK_ID = "20000000-0000-4000-8000-000000000001";
const FIRST_CARD_ID = "30000000-0000-4000-8000-000000000001";

function assertSafeIntegrationDatabase(): void {
  const databaseName = process.env.POSTGRES_DB ?? "";
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Study integration tests require POSTGRES_DB ending in _test",
    );
  }
}

function eventId(sequence: number): string {
  return `40000000-0000-4000-8000-${sequence.toString().padStart(12, "0")}`;
}

async function resetStudyFixtures(): Promise<void> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query("TRUNCATE TABLE review_events");
  await pool.query(
    `INSERT INTO users (id, email, password_hash)
     VALUES ($1, 'study-integration@example.com', 'not-used')`,
    [USER_ID],
  );
  await pool.query(
    "INSERT INTO decks (id, user_id, title) VALUES ($1, $2, 'Integration deck')",
    [DECK_ID, USER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, content, position)
     VALUES ($1, $2, $3, '{"front":"Q","back":"A"}'::jsonb, 0)`,
    [FIRST_CARD_ID, USER_ID, DECK_ID],
  );
}

function statementText(queryArgument: unknown): string {
  if (typeof queryArgument === "string") return queryArgument;
  if (
    queryArgument &&
    typeof (queryArgument as { text?: unknown }).text === "string"
  ) {
    return (queryArgument as { text: string }).text;
  }
  return "";
}

beforeAll(async () => {
  assertSafeIntegrationDatabase();
  await runMigrations();
});

beforeEach(async () => {
  await resetStudyFixtures();
});

afterAll(async () => {
  await closePool();
});

describe("study persistence", () => {
  test("sync batches ownership and collapses progress writes per card", async () => {
    const querySpy = jest.spyOn(Client.prototype, "query");
    const events = Array.from({ length: 10 }, (_, index) => ({
      event_id: eventId(index + 1),
      card_id: FIRST_CARD_ID,
      rating: 4,
      reviewed_at: new Date(Date.UTC(2026, 5, 5, 9, index)).toISOString(),
    }));

    try {
      const syncResponse = await sync(USER_ID, events);
      const statements = querySpy.mock.calls.map(([queryArgument]) =>
        statementText(queryArgument),
      );
      const ownershipQueries = statements.filter((statement) =>
        statement.includes("id = ANY($2::uuid[])"),
      );
      const progressWrites = statements.filter((statement) =>
        statement.includes("INSERT INTO card_progress"),
      );

      expect(syncResponse.acked_event_ids).toHaveLength(10);
      expect(ownershipQueries).toHaveLength(1);
      expect(progressWrites).toHaveLength(1);
      expect(statements.length).toBeLessThan(20);
    } finally {
      querySpy.mockRestore();
    }
  });

  test("concurrent first reviews apply sequentially without a lost update", async () => {
    await Promise.all([
      review(USER_ID, FIRST_CARD_ID, 4),
      review(USER_ID, FIRST_CARD_ID, 4),
    ]);

    const progress = await getPool().query<{
      repetitions: number;
      interval_days: number;
    }>(
      `SELECT repetitions, interval_days
       FROM card_progress WHERE user_id = $1 AND card_id = $2`,
      [USER_ID, FIRST_CARD_ID],
    );

    expect(progress.rows[0]).toEqual({ repetitions: 2, interval_days: 6 });
  });
});
