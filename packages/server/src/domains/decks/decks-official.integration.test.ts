import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import * as decksRepo from "./decks.repository";
import * as studyRepo from "../study/study.repository";
import { review } from "../study/study.service";

const OWNER_ID = "10000000-0000-4000-8000-0000000000a1";
const SUBSCRIBER_ID = "10000000-0000-4000-8000-0000000000b1";
const OUTSIDER_ID = "10000000-0000-4000-8000-0000000000c1";
const DECK_ID = "20000000-0000-4000-8000-0000000000d1";
const DECK_ID_2 = "20000000-0000-4000-8000-0000000000d2";
const CARD_ID = "30000000-0000-4000-8000-0000000000e1";

function assertSafeIntegrationDatabase(): void {
  const databaseName = process.env.POSTGRES_DB ?? "";
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Official-deck integration tests require POSTGRES_DB ending in _test",
    );
  }
}

async function resetFixtures(): Promise<void> {
  const pool = getPool();
  // TRUNCATE ... CASCADE wipes the system-account row the migration seeded,
  // since it's a plain row in `users` — re-seed it per test alongside the
  // fixture accounts.
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, 'official@flashkarte.internal', 'x', 'system')`,
    [decksRepo.SYSTEM_ACCOUNT_ID],
  );
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES
       ($1, 'owner@example.com', 'x'),
       ($2, 'subscriber@example.com', 'x'),
       ($3, 'outsider@example.com', 'x')`,
    [OWNER_ID, SUBSCRIBER_ID, OUTSIDER_ID],
  );
  await pool.query(
    `INSERT INTO decks (id, user_id, title) VALUES
       ($1, $3, 'Original Deck'), ($2, $3, 'Second Deck')`,
    [DECK_ID, DECK_ID_2, OWNER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, content, position)
     VALUES ($1, $2, $3, '{"front":"Q","back":"A"}'::jsonb, 0)`,
    [CARD_ID, OWNER_ID, DECK_ID],
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

describe("official decks", () => {
  test("decks and both course formats receive different stable reference numbers", async () => {
    const pool = getPool();
    const deckNumbers = await pool.query<{ reference_number: number }>(
      "SELECT reference_number FROM decks ORDER BY id",
    );
    const course = await pool.query<{ reference_number: number }>(
      `INSERT INTO courses (user_id, title) VALUES ($1, 'Deck course')
       RETURNING reference_number`,
      [OWNER_ID],
    );
    const subject = await pool.query<{ reference_number: number }>(
      `INSERT INTO subjects (user_id, title) VALUES ($1, 'Lesson course')
       RETURNING reference_number`,
      [OWNER_ID],
    );

    const numbers = [
      ...deckNumbers.rows.map((row) => row.reference_number),
      course.rows[0].reference_number,
      subject.rows[0].reference_number,
    ];
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers.every((number) => number > 0)).toBe(true);
  });

  test("promote makes a deck read-only-shared; subscribe/unsubscribe gate access; progress and mutations stay per-owner", async () => {
    const promoted = await decksRepo.promoteToOfficial(DECK_ID);
    expect(promoted?.is_official).toBe(true);

    const cardOwner = await getPool().query(
      "SELECT user_id FROM cards WHERE id = $1",
      [CARD_ID],
    );
    expect(cardOwner.rows[0].user_id).toBe(decksRepo.SYSTEM_ACCOUNT_ID);

    // Not yet subscribed: outsider sees nothing.
    expect(await decksRepo.getDeck(OUTSIDER_ID, DECK_ID)).toBeNull();
    expect(await decksRepo.getCards(OUTSIDER_ID, DECK_ID)).toHaveLength(0);
    const beforeSub = await decksRepo.listDecksWithCounts(OUTSIDER_ID);
    expect(beforeSub.find((d) => d.id === DECK_ID)).toBeUndefined();

    const subscribed = await decksRepo.subscribeOfficial(
      SUBSCRIBER_ID,
      DECK_ID,
    );
    expect(subscribed).toBe(true);

    // Subscribed user: full read access, appears in their own deck list.
    expect(await decksRepo.getDeck(SUBSCRIBER_ID, DECK_ID)).not.toBeNull();
    expect(await decksRepo.getCards(SUBSCRIBER_ID, DECK_ID)).toHaveLength(1);
    const afterSub = await decksRepo.listDecksWithCounts(SUBSCRIBER_ID);
    expect(afterSub.find((d) => d.id === DECK_ID)?.is_official).toBe(true);

    const due = await studyRepo.getDueAndNewCards(SUBSCRIBER_ID, DECK_ID, 20);
    expect(due.map((c) => c.id)).toContain(CARD_ID);

    // Reviewing writes the subscriber's own progress, not the owner's.
    await review(SUBSCRIBER_ID, CARD_ID, 4);
    const progress = await getPool().query(
      "SELECT user_id FROM card_progress WHERE card_id = $1",
      [CARD_ID],
    );
    expect(progress.rows.map((r) => r.user_id)).toEqual([SUBSCRIBER_ID]);

    // A subscriber can study it but not mutate it — ownership checks are untouched.
    expect(
      await decksRepo.renameDeck(SUBSCRIBER_ID, DECK_ID, "Hijacked"),
    ).toBeNull();
    expect(await decksRepo.deleteDeck(SUBSCRIBER_ID, DECK_ID)).toBeNull();

    await decksRepo.unsubscribeOfficial(SUBSCRIBER_ID, DECK_ID);
    expect(await decksRepo.getDeck(SUBSCRIBER_ID, DECK_ID)).toBeNull();
    // Progress survives unsubscribing, so resubscribing picks up where it left off.
    const progressAfterUnsub = await getPool().query(
      "SELECT user_id FROM card_progress WHERE card_id = $1",
      [CARD_ID],
    );
    expect(progressAfterUnsub.rows).toHaveLength(1);

    const demoted = await decksRepo.demoteFromOfficial(DECK_ID, OWNER_ID);
    expect(demoted?.is_official).toBe(false);
    const cardOwnerAfterDemote = await getPool().query(
      "SELECT user_id FROM cards WHERE id = $1",
      [CARD_ID],
    );
    expect(cardOwnerAfterDemote.rows[0].user_id).toBe(OWNER_ID);
  });

  test("subscribing to a deck that isn't official fails", async () => {
    const result = await decksRepo.subscribeOfficial(SUBSCRIBER_ID, DECK_ID);
    expect(result).toBe(false);
  });

  test("promoting a previously-public deck unpublishes it — no duplicate showing on both App Decks and Library", async () => {
    await decksRepo.setDeckPublic(OWNER_ID, DECK_ID, true);
    const beforePromote = await getPool().query(
      "SELECT is_public FROM decks WHERE id = $1",
      [DECK_ID],
    );
    expect(beforePromote.rows[0].is_public).toBe(true);

    const promoted = await decksRepo.promoteToOfficial(DECK_ID);
    expect(promoted?.is_official).toBe(true);

    const afterPromote = await getPool().query(
      "SELECT is_public, published_at FROM decks WHERE id = $1",
      [DECK_ID],
    );
    expect(afterPromote.rows[0].is_public).toBe(false);
    expect(afterPromote.rows[0].published_at).toBeNull();
  });
});

describe("deck collections", () => {
  test("promote-with-title creates/reuses a collection, orders members, and supports bulk subscribe", async () => {
    const first = await decksRepo.promoteToOfficial(DECK_ID, "CEFR Series");
    const second = await decksRepo.promoteToOfficial(DECK_ID_2, "CEFR Series");
    expect(first?.is_official).toBe(true);
    expect(second?.is_official).toBe(true);

    const collections = await decksRepo.listOfficialCollections(null, 50, 0);
    expect(collections).toHaveLength(1);
    expect(collections[0].title).toBe("CEFR Series");
    expect(Number(collections[0].deck_count)).toBe(2);
    const collectionId = collections[0].id;

    // Case-insensitive title search finds it (citext).
    const searched = await decksRepo.listOfficialCollections("cefr", 50, 0);
    expect(searched).toHaveLength(1);

    const members = await decksRepo.listCollectionDecks(
      OUTSIDER_ID,
      collectionId,
      null,
      50,
      0,
    );
    expect(members.map((m) => m.title)).toEqual([
      "Original Deck",
      "Second Deck",
    ]);
    expect(members.every((m) => m.subscribed === false)).toBe(true);

    // Standalone browsing excludes decks that now belong to a collection.
    const standalone = await decksRepo.listStandaloneOfficial(
      OUTSIDER_ID,
      null,
      50,
      0,
    );
    expect(standalone.find((d) => d.id === DECK_ID)).toBeUndefined();

    const count = await decksRepo.subscribeAllInCollection(
      SUBSCRIBER_ID,
      collectionId,
    );
    expect(count).toBe(2);
    const afterBulk = await decksRepo.listCollectionDecks(
      SUBSCRIBER_ID,
      collectionId,
      null,
      50,
      0,
    );
    expect(afterBulk.every((m) => m.subscribed === true)).toBe(true);

    // Re-promoting without a collectionTitle leaves membership untouched.
    await decksRepo.promoteToOfficial(DECK_ID);
    const stillMember = await decksRepo.getDeck(SUBSCRIBER_ID, DECK_ID);
    expect(stillMember).not.toBeNull();

    // Demoting clears collection membership.
    await decksRepo.demoteFromOfficial(DECK_ID, OWNER_ID);
    const afterDemote = await decksRepo.listCollectionDecks(
      OUTSIDER_ID,
      collectionId,
      null,
      50,
      0,
    );
    expect(afterDemote.map((m) => m.id)).toEqual([DECK_ID_2]);
  });
});
