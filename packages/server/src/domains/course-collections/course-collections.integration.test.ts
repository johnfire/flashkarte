import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import {
  enrollInCatalogCollection,
  getCatalogCollection,
  listCatalogCollections,
} from "./course-collections.service";

const OWNER_ID = "31000000-0000-4000-8000-000000000001";
const LEARNER_ID = "31000000-0000-4000-8000-000000000002";
const COLLECTION_ID = "31000000-0000-4000-8000-000000000003";
const COURSE_ID = "31000000-0000-4000-8000-000000000004";

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "Course collection integration tests require POSTGRES_DB ending in _test",
    );
  }
  await runMigrations();
});

beforeEach(async () => {
  const pool = getPool();
  await pool.query(
    "TRUNCATE subject_enrollments, subjects, course_collections, users CASCADE",
  );
  await pool.query(
    `INSERT INTO users (id, email, password_hash)
     VALUES
       ($1, 'collection-owner@example.com', 'not-used'),
       ($2, 'collection-learner@example.com', 'not-used')`,
    [OWNER_ID, LEARNER_ID],
  );
  await pool.query(
    `INSERT INTO course_collections (id, title, is_official)
     VALUES ($1, 'Art of Electronics', true)`,
    [COLLECTION_ID],
  );
  await pool.query(
    `INSERT INTO subjects (
       id, user_id, title, is_public, is_official, locale,
       course_collection_id, course_collection_position
     ) VALUES ($1, $2, 'Community electronics chapter', true, false, 'en', $3, 0)`,
    [COURSE_ID, OWNER_ID, COLLECTION_ID],
  );
});

afterAll(async () => {
  await closePool();
});

describe("community course collections", () => {
  test("catalogues and enrolls a community course from a curated collection", async () => {
    const communityCollections = await listCatalogCollections(false);
    expect(communityCollections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: COLLECTION_ID,
          title: "Art of Electronics",
          course_count: 1,
        }),
      ]),
    );

    const collection = await getCatalogCollection(COLLECTION_ID, false);
    expect(collection.courses.map((course) => course.id)).toEqual([COURSE_ID]);

    await expect(
      enrollInCatalogCollection(LEARNER_ID, COLLECTION_ID, false),
    ).resolves.toBe(1);
    await expect(
      enrollInCatalogCollection(LEARNER_ID, COLLECTION_ID, false),
    ).resolves.toBe(0);

    const enrollment = await getPool().query(
      "SELECT 1 FROM subject_enrollments WHERE user_id = $1 AND subject_id = $2",
      [LEARNER_ID, COURSE_ID],
    );
    expect(enrollment.rowCount).toBe(1);
  });
});
