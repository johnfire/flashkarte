import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import * as decksRepo from "../decks/decks.repository";
import * as studyRepo from "../study/study.repository";
import * as decksService from "../decks/decks.service";
import * as shares from "../decks/deck-shares.service";
import * as billing from "../billing/billing.service";
import * as schools from "./schools.service";

const ADMIN_ID = "10000000-0000-4000-8000-00000000000a";
const TEACHER_ID = "10000000-0000-4000-8000-0000000000a1";
const OTHER_TEACHER_ID = "10000000-0000-4000-8000-0000000000a2";
const STUDENT_ID = "10000000-0000-4000-8000-0000000000b1";
const CLASSMATE_ID = "10000000-0000-4000-8000-0000000000b2";
const OUTSIDER_ID = "10000000-0000-4000-8000-0000000000c1";
const SCHOOL_LOGIN_ID = "10000000-0000-4000-8000-0000000000d1";
const DECK_ID = "20000000-0000-4000-8000-0000000000d1";
const CARD_ID = "30000000-0000-4000-8000-0000000000e1";

function assertSafeIntegrationDatabase(): void {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "School integration tests require POSTGRES_DB ending in _test",
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
       ($3, 'teacher2@example.com', 'x', 'free'),
       ($4, 'student@example.com', 'x', 'free'),
       ($5, 'classmate@example.com', 'x', 'free'),
       ($6, 'outsider@example.com', 'x', 'free'),
       ($7, 'school@example.com', 'x', 'free')`,
    [
      ADMIN_ID,
      TEACHER_ID,
      OTHER_TEACHER_ID,
      STUDENT_ID,
      CLASSMATE_ID,
      OUTSIDER_ID,
      SCHOOL_LOGIN_ID,
    ],
  );
  await pool.query(
    `INSERT INTO decks (id, user_id, title, content_language)
     VALUES ($1, $2, 'Teacher deck', 'en')`,
    [DECK_ID, TEACHER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, content, position)
     VALUES ($1, $2, $3, '{"front":"Q","back":"A"}'::jsonb, 0)`,
    [CARD_ID, TEACHER_ID, DECK_ID],
  );
}

/** An independent teacher with one class holding STUDENT and CLASSMATE. */
async function independentClass(): Promise<string> {
  await schools.verifyTeacher(ADMIN_ID, TEACHER_ID, { method: "interview" });
  await schools.setOrganization(STUDENT_ID, { accountKind: "student" });
  await schools.setOrganization(CLASSMATE_ID, { accountKind: "student" });
  const created = await schools.createClass({
    teacherId: TEACHER_ID,
    name: "Deutsch A1",
  });
  await schools.setClassMembers(created.id, [STUDENT_ID, CLASSMATE_ID]);
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

describe("account kinds", () => {
  test("a teacher must be verified first, and a school roster names the school", async () => {
    await expect(
      schools.setOrganization(TEACHER_ID, { accountKind: "teacher" }),
    ).rejects.toThrow(/Verify this person/);

    await expect(
      schools.verifyTeacher(ADMIN_ID, TEACHER_ID, { method: "school_roster" }),
    ).rejects.toThrow(/needs the school/);

    const school = await schools.createSchool("Gymnasium Lechfeld");
    await schools.verifyTeacher(ADMIN_ID, TEACHER_ID, {
      method: "school_roster",
      schoolId: school.id,
      note: "On the school's list",
    });
    const row = await getPool().query(
      "SELECT account_kind, school_id FROM users WHERE id = $1",
      [TEACHER_ID],
    );
    expect(row.rows[0]).toEqual({
      account_kind: "teacher",
      school_id: school.id,
    });
  });

  test("individuals cannot belong to a school, school logins must, admins stay individual", async () => {
    const school = await schools.createSchool("Realschule");
    await expect(
      schools.setOrganization(OUTSIDER_ID, {
        accountKind: "individual",
        schoolId: school.id,
      }),
    ).rejects.toThrow(/individual account cannot belong/);
    await expect(
      schools.setOrganization(SCHOOL_LOGIN_ID, { accountKind: "school" }),
    ).rejects.toThrow(/must belong to a school/);
    await expect(
      schools.setOrganization(ADMIN_ID, { accountKind: "student" }),
    ).rejects.toThrow(/admin account must stay/);
  });

  test("a teacher with classes, or a student in classes, cannot silently change kind", async () => {
    await independentClass();
    await expect(
      schools.setOrganization(TEACHER_ID, { accountKind: "individual" }),
    ).rejects.toThrow(/still has classes/);
    await expect(
      schools.setOrganization(STUDENT_ID, { accountKind: "individual" }),
    ).rejects.toThrow(/still in classes/);
  });
});

describe("classes", () => {
  test("only students join, and a school's class takes only that school's students", async () => {
    const school = await schools.createSchool("Gymnasium");
    await schools.verifyTeacher(ADMIN_ID, TEACHER_ID, {
      method: "school_roster",
      schoolId: school.id,
    });
    await schools.setOrganization(STUDENT_ID, {
      accountKind: "student",
      schoolId: school.id,
    });
    await schools.setOrganization(CLASSMATE_ID, { accountKind: "student" });
    const created = await schools.createClass({
      teacherId: TEACHER_ID,
      name: "Biologie 7B",
    });
    expect(created.schoolId).toBe(school.id);

    await expect(
      schools.setClassMembers(created.id, [STUDENT_ID, OUTSIDER_ID]),
    ).rejects.toThrow(/outsider@example.com: not a student account/);
    await expect(
      schools.setClassMembers(created.id, [CLASSMATE_ID]),
    ).rejects.toThrow(/not in this class's school/);

    // All-or-nothing: the failed attempts left the class empty.
    expect((await schools.getClass(created.id)).members).toHaveLength(0);

    await schools.setClassMembers(created.id, [STUDENT_ID]);
    const detail = await schools.getClass(created.id);
    expect(detail.members.map((m) => m.email)).toEqual(["student@example.com"]);
  });

  test("a class can only belong to a teacher", async () => {
    await expect(
      schools.createClass({ teacherId: OUTSIDER_ID, name: "Nope" }),
    ).rejects.toThrow(/Only a teacher/);
  });
});

describe("deck sharing", () => {
  test("a class share reaches its members only; adding it lets them study but not edit", async () => {
    const classId = await independentClass();
    await shares.setShares(TEACHER_ID, DECK_ID, {
      shares: [{ scope: "class", classId }],
    });

    const seen = await shares.listSharedWithMe(STUDENT_ID);
    expect(seen.map((d) => d.id)).toEqual([DECK_ID]);
    expect(seen[0].subscribed).toBe(false);
    expect(await shares.listSharedWithMe(OUTSIDER_ID)).toHaveLength(0);

    // Shared but not yet added: not in their list, not readable.
    expect(await decksRepo.getDeck(STUDENT_ID, DECK_ID)).toBeNull();

    await decksService.subscribe(STUDENT_ID, DECK_ID);
    const list = await decksRepo.listDecksWithCounts(STUDENT_ID);
    expect(list.find((d) => d.id === DECK_ID)?.is_shared).toBe(true);
    expect(await decksRepo.getCards(STUDENT_ID, DECK_ID)).toHaveLength(1);
    const due = await studyRepo.getDueAndNewCards(STUDENT_ID, DECK_ID, 20);
    expect(due.map((c) => c.id)).toContain(CARD_ID);

    expect(await decksRepo.renameDeck(STUDENT_ID, DECK_ID, "Mine")).toBeNull();
    expect(await decksRepo.deleteDeck(STUDENT_ID, DECK_ID)).toBeNull();

    // An outsider cannot add it by guessing the id.
    await expect(decksService.subscribe(OUTSIDER_ID, DECK_ID)).rejects.toThrow(
      /Deck not found/,
    );
  });

  test("leaving the class ends access at once, even with the deck already added", async () => {
    const classId = await independentClass();
    await shares.setShares(TEACHER_ID, DECK_ID, {
      shares: [{ scope: "class", classId }],
    });
    await decksService.subscribe(STUDENT_ID, DECK_ID);
    await schools.setClassMembers(classId, [CLASSMATE_ID]);

    expect(await decksRepo.getDeck(STUDENT_ID, DECK_ID)).toBeNull();
    expect(
      (await decksRepo.listDecksWithCounts(STUDENT_ID)).find(
        (d) => d.id === DECK_ID,
      ),
    ).toBeUndefined();
    expect(
      await studyRepo.getDueAndNewCards(STUDENT_ID, DECK_ID, 20),
    ).toHaveLength(0);
  });

  test("'my students' reaches every class the owner teaches", async () => {
    await independentClass();
    await shares.setShares(TEACHER_ID, DECK_ID, {
      shares: [{ scope: "teacher_students" }],
    });
    expect(
      (await shares.listSharedWithMe(CLASSMATE_ID)).map((d) => d.id),
    ).toEqual([DECK_ID]);
    expect(await shares.listSharedWithMe(OUTSIDER_ID)).toHaveLength(0);
  });

  test("a school share reaches the school's login, teachers and students, nobody else", async () => {
    const school = await schools.createSchool("Gymnasium");
    await schools.verifyTeacher(ADMIN_ID, TEACHER_ID, {
      method: "school_roster",
      schoolId: school.id,
    });
    await schools.verifyTeacher(ADMIN_ID, OTHER_TEACHER_ID, {
      method: "school_roster",
      schoolId: school.id,
    });
    await schools.setOrganization(STUDENT_ID, {
      accountKind: "student",
      schoolId: school.id,
    });
    await schools.setOrganization(SCHOOL_LOGIN_ID, {
      accountKind: "school",
      schoolId: school.id,
    });

    await shares.setShares(TEACHER_ID, DECK_ID, {
      shares: [{ scope: "school" }],
    });
    for (const viewer of [OTHER_TEACHER_ID, STUDENT_ID, SCHOOL_LOGIN_ID]) {
      expect((await shares.listSharedWithMe(viewer)).map((d) => d.id)).toEqual([
        DECK_ID,
      ]);
    }
    expect(await shares.listSharedWithMe(OUTSIDER_ID)).toHaveLength(0);
  });

  test("a student shares with their classmates and teacher, never with a class they are not in", async () => {
    const classId = await independentClass();
    const studentDeck = await getPool().query<{ id: string }>(
      "INSERT INTO decks (user_id, title) VALUES ($1, 'My notes') RETURNING id",
      [STUDENT_ID],
    );
    const deckId = studentDeck.rows[0].id;

    await expect(
      shares.setShares(STUDENT_ID, deckId, { shares: [{ scope: "school" }] }),
    ).rejects.toThrow(/cannot share with a school/);
    await expect(
      shares.setShares(STUDENT_ID, deckId, {
        shares: [{ scope: "teacher_students" }],
      }),
    ).rejects.toThrow(/Only a teacher/);

    await shares.setShares(STUDENT_ID, deckId, {
      shares: [{ scope: "class", classId }],
    });
    expect(
      (await shares.listSharedWithMe(CLASSMATE_ID)).map((d) => d.id),
    ).toEqual([deckId]);
    expect(
      (await shares.listSharedWithMe(TEACHER_ID)).map((d) => d.id),
    ).toEqual([deckId]);

    const otherClass = await schools.createClass({
      teacherId: TEACHER_ID,
      name: "Other",
    });
    await expect(
      shares.setShares(CLASSMATE_ID, DECK_ID, {
        shares: [{ scope: "class", classId: otherClass.id }],
      }),
    ).rejects.toThrow(/Deck not found/);
    const classmateDeck = await getPool().query<{ id: string }>(
      "INSERT INTO decks (user_id, title) VALUES ($1, 'Theirs') RETURNING id",
      [CLASSMATE_ID],
    );
    await expect(
      shares.setShares(CLASSMATE_ID, classmateDeck.rows[0].id, {
        shares: [{ scope: "class", classId: otherClass.id }],
      }),
    ).rejects.toThrow(/only share with your own classes/);
  });

  test("an individual account has nothing to share with beyond public", async () => {
    const own = await getPool().query<{ id: string }>(
      "INSERT INTO decks (user_id, title) VALUES ($1, 'Solo') RETURNING id",
      [OUTSIDER_ID],
    );
    const { options } = await shares.getShares(OUTSIDER_ID, own.rows[0].id);
    expect(options).toMatchObject({
      accountKind: "individual",
      classes: [],
      canShareWithSchool: false,
      canShareWithAllStudents: false,
    });
    await expect(
      shares.setShares(OUTSIDER_ID, own.rows[0].id, {
        shares: [{ scope: "school" }],
      }),
    ).rejects.toThrow(/cannot share with a school/);
  });
});

describe("free limit", () => {
  test("a free student's added teacher decks count toward their 10", async () => {
    const classId = await independentClass();
    await shares.setShares(TEACHER_ID, DECK_ID, {
      shares: [{ scope: "class", classId }],
    });
    await makeOwnedDecks(STUDENT_ID, 9);
    await decksService.subscribe(STUDENT_ID, DECK_ID);
    const status = await billing.getStatus(STUDENT_ID);
    expect(status.activeUnitCount).toBe(10);

    const units = await billing.listUnits(STUDENT_ID);
    expect(units.map((u) => u.unit_id)).toContain(DECK_ID);

    // The 11th is refused.
    const second = await getPool().query<{ id: string }>(
      "INSERT INTO decks (user_id, title) VALUES ($1, 'Second') RETURNING id",
      [TEACHER_ID],
    );
    await shares.setShares(TEACHER_ID, second.rows[0].id, {
      shares: [{ scope: "class", classId }],
    });
    await expect(
      decksService.subscribe(STUDENT_ID, second.rows[0].id),
    ).rejects.toThrow(/up to 10 active/);
  });

  test("school members are never limited", async () => {
    const school = await schools.createSchool("Gymnasium");
    await schools.setOrganization(STUDENT_ID, {
      accountKind: "student",
      schoolId: school.id,
    });
    await makeOwnedDecks(STUDENT_ID, 12);
    const status = await billing.getStatus(STUDENT_ID);
    expect(status.plan).toBe("paid");
    expect(status.activeUnitLimit).toBeNull();
  });
});
