import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import * as decksRepo from "../decks/decks.repository";
import * as studyRepo from "../study/study.repository";
import * as deckShares from "../decks/deck-shares.service";
import * as courses from "../courses/courses.service";
import * as subjects from "../subjects/subjects.service";
import * as subjectsRepo from "../subjects/subjects.repository";
import * as schools from "./schools.service";

const ADMIN_ID = "10000000-0000-4000-8000-00000000000a";
const LEADER_ID = "10000000-0000-4000-8000-0000000000a1";
const MEMBER_ID = "10000000-0000-4000-8000-0000000000b1";
const INDEPENDENT_ID = "10000000-0000-4000-8000-0000000000b2";
const DECK_ID = "20000000-0000-4000-8000-0000000000d1";
const CARD_ID = "30000000-0000-4000-8000-0000000000e1";
const COURSE_ID = "40000000-0000-4000-8000-0000000000f1";
const SUBJECT_ID = "50000000-0000-4000-8000-0000000000a1";

let schoolId: string;

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error("Integration tests require POSTGRES_DB ending in _test");
  }
  await runMigrations();
});

beforeEach(async () => {
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
       ($2, 'leader@example.com', 'x', 'free'),
       ($3, 'member@example.com', 'x', 'free'),
       ($4, 'independent@example.com', 'x', 'free')`,
    [ADMIN_ID, LEADER_ID, MEMBER_ID, INDEPENDENT_ID],
  );
  await pool.query(
    "INSERT INTO decks (id, user_id, title) VALUES ($1, $2, 'Vokabeln')",
    [DECK_ID, LEADER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, content, position)
     VALUES ($1, $2, $3, '{"front":"Q","back":"A"}'::jsonb, 0)`,
    [CARD_ID, LEADER_ID, DECK_ID],
  );
  await pool.query(
    "INSERT INTO courses (id, user_id, title) VALUES ($1, $2, 'A1 Kurs')",
    [COURSE_ID, LEADER_ID],
  );
  await pool.query(
    "INSERT INTO course_decks (course_id, deck_id, position) VALUES ($1, $2, 0)",
    [COURSE_ID, DECK_ID],
  );
  await pool.query(
    "INSERT INTO subjects (id, user_id, title) VALUES ($1, $2, 'Grammatik')",
    [SUBJECT_ID, LEADER_ID],
  );

  // A school with one course leader and one participant.
  schoolId = (await schools.createSchool("Sprachschule Hannover")).id;
  await schools.verifyTeacher(ADMIN_ID, LEADER_ID, {
    method: "school_roster",
    schoolId,
  });
  await schools.setOrganization(MEMBER_ID, {
    accountKind: "student",
    schoolId,
  });
});

afterAll(async () => {
  await closePool();
});

async function shareEverythingWithSchool(): Promise<void> {
  const shares = { shares: [{ scope: "school" }] };
  await deckShares.setShares(LEADER_ID, DECK_ID, shares);
  await courses.setShares(LEADER_ID, COURSE_ID, shares);
  await subjects.setShares(LEADER_ID, SUBJECT_ID, shares);
}

test("a school member gets a shared deck in their list and can study it, with no Add step", async () => {
  await shareEverythingWithSchool();

  const list = await decksRepo.listDecksWithCounts(MEMBER_ID);
  const deck = list.find((d) => d.id === DECK_ID);
  expect(deck).toMatchObject({ is_shared: true, auto_added: true });
  expect(await decksRepo.getCards(MEMBER_ID, DECK_ID)).toHaveLength(1);
  const due = await studyRepo.getDueAndNewCards(MEMBER_ID, DECK_ID, 20);
  expect(due.map((c) => c.id)).toContain(CARD_ID);

  // Nothing waits in "Shared with you".
  const waiting = await deckShares.listSharedWithMe(MEMBER_ID);
  expect(waiting.every((d) => d.subscribed)).toBe(true);
});

test("a school member gets shared deck-courses and structured courses with no Add step", async () => {
  await shareEverythingWithSchool();

  const mine = await courses.listCourses(MEMBER_ID);
  expect(mine.map((c) => [c.id, c.auto_added])).toEqual([[COURSE_ID, true]]);
  const detail = await courses.getCourse(MEMBER_ID, COURSE_ID);
  expect(detail).toMatchObject({ subscribed: true, auto_added: true });

  expect(
    (await subjects.listSubjects(MEMBER_ID)).map((s) => s.id),
  ).toEqual([SUBJECT_ID]);
  expect(
    await subjectsRepo.findLearningSubject(MEMBER_ID, SUBJECT_ID),
  ).not.toBeNull();
  const waiting = await subjects.listSharedWithMe(MEMBER_ID);
  expect(waiting.every((s) => s.enrolled)).toBe(true);
});

test("leaving the school removes all of it at once", async () => {
  await shareEverythingWithSchool();
  await schools.setOrganization(MEMBER_ID, {
    accountKind: "student",
    schoolId: null,
  });

  expect(
    (await decksRepo.listDecksWithCounts(MEMBER_ID)).find(
      (d) => d.id === DECK_ID,
    ),
  ).toBeUndefined();
  expect(await decksRepo.getDeck(MEMBER_ID, DECK_ID)).toBeNull();
  expect(await courses.listCourses(MEMBER_ID)).toHaveLength(0);
  expect(await subjects.listSubjects(MEMBER_ID)).toHaveLength(0);
  expect(
    await subjectsRepo.findLearningSubject(MEMBER_ID, SUBJECT_ID),
  ).toBeNull();
});

test("a free participant of an independent course leader still adds content themselves", async () => {
  // The school's course leader also runs an independent group.
  await schools.setOrganization(INDEPENDENT_ID, { accountKind: "student" });
  const group = await schools.createClass({
    teacherId: LEADER_ID,
    name: "Abendkurs",
  });
  // A school course leader's group belongs to the school, so make the
  // participant's group membership explicit through a "my participants"
  // share instead of a school share.
  await getPool().query("UPDATE classes SET school_id = NULL WHERE id = $1", [
    group.id,
  ]);
  await schools.setClassMembers(group.id, [INDEPENDENT_ID]);
  await deckShares.setShares(LEADER_ID, DECK_ID, {
    shares: [{ scope: "teacher_students" }],
  });

  expect(await decksRepo.getDeck(INDEPENDENT_ID, DECK_ID)).toBeNull();
  const waiting = await deckShares.listSharedWithMe(INDEPENDENT_ID);
  expect(waiting.map((d) => [d.id, d.subscribed])).toEqual([[DECK_ID, false]]);
});
