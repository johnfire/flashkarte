import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import * as categoriesRepo from "./categories.repository";
import * as categoriesService from "./categories.service";
import * as decksRepo from "../decks/decks.repository";
import * as libraryRepo from "../library/library.repository";
import { ConflictError } from "../../utils/errors";

const OWNER_ID = "10000000-0000-4000-8000-0000000000a1";

function assertSafeIntegrationDatabase(): void {
  const databaseName = process.env.POSTGRES_DB ?? "";
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Category integration tests require POSTGRES_DB ending in _test",
    );
  }
}

async function resetFixtures(): Promise<void> {
  const pool = getPool();
  // deck_categories/deck_collections have no FK to users, so they aren't
  // swept up by "TRUNCATE users CASCADE" below — clear them explicitly.
  await pool.query("TRUNCATE TABLE deck_categories, deck_collections CASCADE");
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, 'official@flashkarte.internal', 'x', 'system')`,
    [decksRepo.SYSTEM_ACCOUNT_ID],
  );
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES ($1, 'owner@example.com', 'x')`,
    [OWNER_ID],
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

describe("category tree constraints", () => {
  test("service enforces two levels and blocks delete-with-children; DB trigger backstops depth", async () => {
    const languageLearning = await categoriesService.create(
      "Language Learning",
      undefined,
    );
    const german = await categoriesService.create(
      "German",
      languageLearning.id,
    );

    // Service-level: a 3rd level is rejected before hitting the DB.
    await expect(
      categoriesService.create("Bavarian", german.id),
    ).rejects.toThrow("categories can only be nested two levels deep");

    // Defense in depth: the DB trigger itself also rejects a 3rd level even
    // if a caller bypasses the service's pre-check.
    await expect(categoriesRepo.create("Bavarian", german.id)).rejects.toThrow(
      /nested two levels deep/,
    );

    // Can't delete a category that still has a subcategory under it.
    await expect(categoriesService.remove(languageLearning.id)).rejects.toThrow(
      ConflictError,
    );

    // Deleting the (empty) subcategory first, then the now-empty parent,
    // both succeed.
    await categoriesService.remove(german.id);
    await categoriesService.remove(languageLearning.id);
    expect(await categoriesRepo.getById(languageLearning.id)).toBeNull();
  });

  test("titles are case-insensitively unique per level but reusable across parents", async () => {
    const languageLearning = await categoriesService.create(
      "Language Learning",
      undefined,
    );
    const ai = await categoriesService.create("AI", undefined);

    await expect(
      categoriesService.create("language learning", undefined),
    ).rejects.toThrow("A category with this title already exists");

    // "General" can exist under two different parents without colliding.
    await categoriesService.create("General", languageLearning.id);
    await expect(
      categoriesService.create("General", ai.id),
    ).resolves.toMatchObject({ title: "General" });
  });
});

describe("browse filtering and counts", () => {
  test("assigning categories to a collection and a standalone deck scopes them for browse, alphabetically", async () => {
    const languageLearning = await categoriesService.create(
      "Language Learning",
      undefined,
    );
    const german = await categoriesService.create(
      "German",
      languageLearning.id,
    );

    // A collection in the "German" subcategory.
    const collection = await getPool().query<{ id: string }>(
      "INSERT INTO deck_collections (title) VALUES ('CEFR A1') RETURNING id",
    );
    const collectionId = collection.rows[0].id;
    await decksRepo.setCollectionCategory(collectionId, german.id);

    // A standalone official deck directly under the top-level category.
    const deck = await getPool().query<{ id: string }>(
      `INSERT INTO decks (id, user_id, title, is_official)
       VALUES (uuid_generate_v4(), $1, 'Über die Grammatik', true) RETURNING id`,
      [decksRepo.SYSTEM_ACCOUNT_ID],
    );
    const deckId = deck.rows[0].id;
    await decksRepo.setDeckCategory(deckId, languageLearning.id);

    // An uncategorized standalone deck.
    await getPool().query(
      `INSERT INTO decks (user_id, title, is_official)
       VALUES ($1, 'Anfänger Kanji', true)`,
      [decksRepo.SYSTEM_ACCOUNT_ID],
    );

    // A public (non-official) Library deck, also filed under "German".
    const publicDeck = await getPool().query<{ id: string }>(
      `INSERT INTO decks (user_id, title, is_public, category_id)
       VALUES ($1, 'Deutsch für Anfänger', true, $2) RETURNING id`,
      [OWNER_ID, german.id],
    );

    const inGerman = await decksRepo.listOfficialCollections(
      null,
      50,
      0,
      german.id,
    );
    expect(inGerman.map((c) => c.id)).toEqual([collectionId]);

    const inLanguageLearning = await decksRepo.listStandaloneOfficial(
      OWNER_ID,
      null,
      50,
      0,
      languageLearning.id,
    );
    expect(inLanguageLearning.map((d) => d.id)).toEqual([deckId]);

    const uncategorizedDecks = await decksRepo.listStandaloneOfficial(
      OWNER_ID,
      null,
      50,
      0,
      null,
    );
    expect(uncategorizedDecks.map((d) => d.title)).toEqual(["Anfänger Kanji"]);

    // Omitting the filter (the flat search box) sees everything regardless of category.
    const everything = await decksRepo.listStandaloneOfficial(
      OWNER_ID,
      null,
      50,
      0,
    );
    expect(everything).toHaveLength(2);

    const tree = await categoriesService.getTree();
    const topLevel = tree.find((c) => c.id === languageLearning.id)!;
    expect(topLevel.officialCount).toBe(1); // the standalone deck placed directly on it
    expect(topLevel.publicCount).toBe(0);
    const germanNode = topLevel.subcategories[0];
    expect(germanNode.officialCount).toBe(1); // the collection under "German"
    expect(germanNode.publicCount).toBe(1); // the public Library deck under "German"
    const uncategorized = tree.find((c) => c.id === "uncategorized")!;
    expect(uncategorized.officialCount).toBe(1);

    const libraryInGerman = await libraryRepo.listPublic(
      null,
      50,
      0,
      german.id,
    );
    expect(libraryInGerman.map((d) => d.id)).toEqual([publicDeck.rows[0].id]);
  });

  test("category deletion clears the category_id on decks and collections it held (ON DELETE SET NULL)", async () => {
    const ai = await categoriesService.create("AI", undefined);
    const deck = await getPool().query<{ id: string }>(
      `INSERT INTO decks (id, user_id, title, is_official)
       VALUES (uuid_generate_v4(), $1, 'Prompting Basics', true) RETURNING id`,
      [decksRepo.SYSTEM_ACCOUNT_ID],
    );
    await decksRepo.setDeckCategory(deck.rows[0].id, ai.id);

    await categoriesService.remove(ai.id);

    const row = await getPool().query<{ category_id: string | null }>(
      "SELECT category_id FROM decks WHERE id = $1",
      [deck.rows[0].id],
    );
    expect(row.rows[0].category_id).toBeNull();
  });
});
