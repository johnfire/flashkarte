import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import * as decksRepo from "../decks/decks.repository";
import * as studyRepo from "../study/study.repository";
import * as courses from "../courses/courses.service";
import * as subjects from "../subjects/subjects.service";
import * as subjectsRepo from "../subjects/subjects.repository";
import * as billing from "../billing/billing.service";
import * as schools from "./schools.service";
import { createAsset, getAssetSvg } from "../assets/assets.service";

const ADMIN_ID = "10000000-0000-4000-8000-00000000000a";
const TEACHER_ID = "10000000-0000-4000-8000-0000000000a1";
const STUDENT_ID = "10000000-0000-4000-8000-0000000000b1";
const OUTSIDER_ID = "10000000-0000-4000-8000-0000000000c1";
const COURSE_ID = "40000000-0000-4000-8000-0000000000f1";
const DECK_A = "20000000-0000-4000-8000-0000000000d1";
const DECK_B = "20000000-0000-4000-8000-0000000000d2";
const CARD_A = "30000000-0000-4000-8000-0000000000e1";
const SUBJECT_ID = "50000000-0000-4000-8000-0000000000a1";

function assertSafeIntegrationDatabase(): void {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "Sharing integration tests require POSTGRES_DB ending in _test",
    );
  }
}

async function resetFixtures(): Promise<void> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users, schools CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, 'official@flashkarte.internal', 'x', 'system')`,
    [decksRepo.SYSTEM_ACCOUNT_ID],
  );
  await pool.query(
    `INSERT INTO users (id, email, password_hash, account_type) VALUES
       ($1, 'admin@example.com', 'x', 'admin'),
       ($2, 'teacher@example.com', 'x', 'free'),
       ($3, 'student@example.com', 'x', 'free'),
       ($4, 'outsider@example.com', 'x', 'free')`,
    [ADMIN_ID, TEACHER_ID, STUDENT_ID, OUTSIDER_ID],
  );
  // A two-deck course and a private (not public) structured course.
  await pool.query(
    `INSERT INTO decks (id, user_id, title) VALUES
       ($1, $3, 'Deck A'), ($2, $3, 'Deck B')`,
    [DECK_A, DECK_B, TEACHER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, content, position)
     VALUES ($1, $2, $3, '{"front":"Q","back":"A"}'::jsonb, 0)`,
    [CARD_A, TEACHER_ID, DECK_A],
  );
  await pool.query(
    "INSERT INTO courses (id, user_id, title) VALUES ($1, $2, 'Biologie')",
    [COURSE_ID, TEACHER_ID],
  );
  await pool.query(
    `INSERT INTO course_decks (course_id, deck_id, position) VALUES
       ($1, $2, 0), ($1, $3, 1)`,
    [COURSE_ID, DECK_A, DECK_B],
  );
  await pool.query(
    "INSERT INTO subjects (id, user_id, title) VALUES ($1, $2, 'Zellbiologie')",
    [SUBJECT_ID, TEACHER_ID],
  );
}

/** An independent teacher with one class holding STUDENT. */
async function independentClass(): Promise<string> {
  await schools.verifyTeacher(ADMIN_ID, TEACHER_ID, { method: "interview" });
  await schools.setOrganization(STUDENT_ID, { accountKind: "student" });
  const created = await schools.createClass({
    teacherId: TEACHER_ID,
    name: "Bio 7B",
  });
  await schools.setClassMembers(created.id, [STUDENT_ID]);
  return created.id;
}

async function makeOwnedDecks(userId: string, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await getPool().query(
      "INSERT INTO decks (user_id, title) VALUES ($1, $2)",
      [userId, `Own ${i}`],
    );
  }
}

beforeAll(async () => {
  assertSafeIntegrationDatabase();
  await runMigrations();
});

beforeEach(resetFixtures);

afterAll(async () => {
  await closePool();
});

describe("shared deck-courses", () => {
  test("a class share lets members add the course and study its decks through it, read-only", async () => {
    const classId = await independentClass();
    await courses.setShares(TEACHER_ID, COURSE_ID, {
      shares: [{ scope: "class", classId }],
    });

    const seen = await courses.listSharedWithMe(STUDENT_ID);
    expect(seen.map((c) => [c.id, c.decksTotal, c.subscribed])).toEqual([
      [COURSE_ID, 2, false],
    ]);
    expect(await courses.listSharedWithMe(OUTSIDER_ID)).toHaveLength(0);

    // Viewable before adding, but its decks are not studiable yet.
    expect((await courses.getCourse(STUDENT_ID, COURSE_ID)).is_shared).toBe(
      true,
    );
    expect(await decksRepo.getDeck(STUDENT_ID, DECK_A)).toBeNull();

    await courses.subscribeShared(STUDENT_ID, COURSE_ID);
    const mine = await courses.listCourses(STUDENT_ID);
    expect(mine.map((c) => [c.id, c.is_shared])).toEqual([[COURSE_ID, true]]);

    expect(await decksRepo.getCards(STUDENT_ID, DECK_A)).toHaveLength(1);
    const due = await studyRepo.getDueAndNewCards(STUDENT_ID, DECK_A, 20);
    expect(due.map((c) => c.id)).toContain(CARD_A);
    // Reached through the course, not cluttering My Decks.
    expect(await decksRepo.listDecksWithCounts(STUDENT_ID)).toHaveLength(0);

    // Never editable by the learner.
    await expect(
      courses.updateCourse(STUDENT_ID, COURSE_ID, { title: "Mine" }),
    ).rejects.toThrow(/Course not found/);
    expect(await decksRepo.renameDeck(STUDENT_ID, DECK_A, "Mine")).toBeNull();

    await expect(
      courses.subscribeShared(OUTSIDER_ID, COURSE_ID),
    ).rejects.toThrow(/Course not found/);
    await expect(courses.getCourse(OUTSIDER_ID, COURSE_ID)).rejects.toThrow(
      /Course not found/,
    );
  });

  test("leaving the class ends access to the course and its decks at once", async () => {
    const classId = await independentClass();
    await courses.setShares(TEACHER_ID, COURSE_ID, {
      shares: [{ scope: "teacher_students" }],
    });
    await courses.subscribeShared(STUDENT_ID, COURSE_ID);
    await schools.setClassMembers(classId, []);

    expect(await courses.listCourses(STUDENT_ID)).toHaveLength(0);
    await expect(courses.getCourse(STUDENT_ID, COURSE_ID)).rejects.toThrow(
      /Course not found/,
    );
    expect(await decksRepo.getDeck(STUDENT_ID, DECK_A)).toBeNull();
    expect(
      await studyRepo.getDueAndNewCards(STUDENT_ID, DECK_A, 20),
    ).toHaveLength(0);
    expect((await billing.getStatus(STUDENT_ID)).activeUnitCount).toBe(0);
  });

  test("an added shared course counts once toward the free 10, not once per deck", async () => {
    const classId = await independentClass();
    await courses.setShares(TEACHER_ID, COURSE_ID, {
      shares: [{ scope: "class", classId }],
    });
    await makeOwnedDecks(STUDENT_ID, 9);
    await courses.subscribeShared(STUDENT_ID, COURSE_ID);
    expect((await billing.getStatus(STUDENT_ID)).activeUnitCount).toBe(10);
    const units = await billing.listUnits(STUDENT_ID);
    expect(
      units.filter((u) => u.unit_id === COURSE_ID).map((u) => u.unit_type),
    ).toEqual(["course"]);
  });
});

describe("shared structured courses", () => {
  test("a class member can enrol in a private course shared with the class; outsiders cannot", async () => {
    const classId = await independentClass();
    await subjects.setShares(TEACHER_ID, SUBJECT_ID, {
      shares: [{ scope: "class", classId }],
    });

    const seen = await subjects.listSharedWithMe(STUDENT_ID);
    expect(seen.map((s) => [s.id, s.enrolled])).toEqual([[SUBJECT_ID, false]]);

    await subjects.enrollInPublicSubject(STUDENT_ID, SUBJECT_ID);
    expect(
      await subjectsRepo.findLearningSubject(STUDENT_ID, SUBJECT_ID),
    ).not.toBeNull();
    expect((await subjects.listSubjects(STUDENT_ID)).map((s) => s.id)).toEqual([
      SUBJECT_ID,
    ]);
    expect((await billing.getStatus(STUDENT_ID)).activeUnitCount).toBe(1);

    await expect(
      subjects.enrollInPublicSubject(OUTSIDER_ID, SUBJECT_ID),
    ).rejects.toThrow(/Course not found/);
  });

  test("class members see the course's images; they stop when the student leaves", async () => {
    const classId = await independentClass();
    const image = await createAsset(
      TEACHER_ID,
      SUBJECT_ID,
      {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>',
      },
      "human",
    );
    await subjects.setShares(TEACHER_ID, SUBJECT_ID, {
      shares: [{ scope: "class", classId }],
    });
    await subjects.enrollInPublicSubject(STUDENT_ID, SUBJECT_ID);
    expect(await getAssetSvg(STUDENT_ID, SUBJECT_ID, image.id)).toContain(
      "<svg",
    );
    await expect(
      getAssetSvg(OUTSIDER_ID, SUBJECT_ID, image.id),
    ).rejects.toThrow(/not found/);

    await schools.setClassMembers(classId, []);
    await expect(getAssetSvg(STUDENT_ID, SUBJECT_ID, image.id)).rejects.toThrow(
      /not found/,
    );
  });

  test("leaving the class ends access and the course stops counting", async () => {
    const classId = await independentClass();
    await subjects.setShares(TEACHER_ID, SUBJECT_ID, {
      shares: [{ scope: "teacher_students" }],
    });
    await subjects.enrollInPublicSubject(STUDENT_ID, SUBJECT_ID);
    await schools.setClassMembers(classId, []);

    expect(
      await subjectsRepo.findLearningSubject(STUDENT_ID, SUBJECT_ID),
    ).toBeNull();
    expect(await subjects.listSubjects(STUDENT_ID)).toHaveLength(0);
    expect((await billing.getStatus(STUDENT_ID)).activeUnitCount).toBe(0);
  });

  test("a free student at 10 cannot enrol in another shared course", async () => {
    const classId = await independentClass();
    await subjects.setShares(TEACHER_ID, SUBJECT_ID, {
      shares: [{ scope: "class", classId }],
    });
    await makeOwnedDecks(STUDENT_ID, 10);
    await expect(
      subjects.enrollInPublicSubject(STUDENT_ID, SUBJECT_ID),
    ).rejects.toThrow(/up to 10 active/);
  });

  test("public courses still enrol exactly as before", async () => {
    await getPool().query(
      "UPDATE subjects SET is_public = true WHERE id = $1",
      [SUBJECT_ID],
    );
    await subjects.enrollInPublicSubject(OUTSIDER_ID, SUBJECT_ID);
    expect(
      await subjectsRepo.findLearningSubject(OUTSIDER_ID, SUBJECT_ID),
    ).not.toBeNull();
  });

  test("app (official) courses cannot be given narrower audiences", async () => {
    await independentClass();
    await getPool().query(
      "UPDATE subjects SET is_official = true, is_public = true WHERE id = $1",
      [SUBJECT_ID],
    );
    await expect(
      subjects.setShares(TEACHER_ID, SUBJECT_ID, {
        shares: [{ scope: "teacher_students" }],
      }),
    ).rejects.toThrow(/already shared with everyone/);
  });
});
