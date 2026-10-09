import { query, queryOne, withTransaction } from "../../db/client";
import type { Queryable } from "../../db/queryable";

export type AccountKind = "individual" | "school" | "teacher" | "student";

export interface SchoolRow {
  id: string;
  name: string;
  created_at: Date;
  member_count: number;
}

export interface OrgUserRow {
  id: string;
  email: string;
  role: string;
  account_type: string;
  account_kind: AccountKind;
  school_id: string | null;
}

export interface ClassRow {
  id: string;
  name: string;
  teacher_id: string;
  teacher_email: string;
  school_id: string | null;
  school_name: string | null;
  member_count: number;
  created_at: Date;
}

export interface ClassMemberRow {
  id: string;
  email: string;
  display_name: string | null;
}

export interface SchoolMemberRow {
  id: string;
  email: string;
  account_type: string;
  account_kind: AccountKind;
  teacher_verified: boolean;
  email_verified_at: Date | null;
  class_links: { id: string; name: string }[];
}

const CLASS_SELECT = `
  SELECT c.id, c.name, c.teacher_id, t.email AS teacher_email,
         c.school_id, s.name AS school_name, c.created_at,
         (SELECT count(*)::int FROM class_members m WHERE m.class_id = c.id) AS member_count
  FROM classes c
  JOIN users t ON t.id = c.teacher_id
  LEFT JOIN schools s ON s.id = c.school_id`;

export function listSchools() {
  return query<SchoolRow>(
    `SELECT s.id, s.name, s.created_at,
            (SELECT count(*)::int FROM users u WHERE u.school_id = s.id) AS member_count
     FROM schools s
     ORDER BY s.name COLLATE de_phonebook ASC`,
  );
}

export function findSchool(id: string) {
  return queryOne<{ id: string; name: string }>(
    "SELECT id, name FROM schools WHERE id = $1",
    [id],
  );
}

export function findSchoolDetail(id: string) {
  return queryOne<SchoolRow>(
    `SELECT s.id, s.name, s.created_at,
            (SELECT count(*)::int FROM users u WHERE u.school_id = s.id) AS member_count
     FROM schools s
     WHERE s.id = $1`,
    [id],
  );
}

/** List school members with the classes they teach or attend. */
export function listSchoolMembers(schoolId: string) {
  return query<SchoolMemberRow>(
    `WITH class_links AS (
       SELECT c.teacher_id AS user_id, c.id, c.name
       FROM classes c
       WHERE c.school_id = $1
       UNION ALL
       SELECT m.student_id AS user_id, c.id, c.name
       FROM classes c
       JOIN class_members m ON m.class_id = c.id
       WHERE c.school_id = $1
     )
     SELECT u.id, u.email, u.account_type, u.account_kind,
            EXISTS (
              SELECT 1 FROM teacher_verifications tv WHERE tv.user_id = u.id
            ) AS teacher_verified,
            u.email_verified_at,
            COALESCE(
              json_agg(
                json_build_object('id', cl.id, 'name', cl.name) ORDER BY cl.name
              ) FILTER (WHERE cl.id IS NOT NULL),
              '[]'::json
            ) AS class_links
     FROM users u
     LEFT JOIN class_links cl ON cl.user_id = u.id
     WHERE u.school_id = $1
     GROUP BY u.id
     ORDER BY u.email`,
    [schoolId],
  );
}

export function createSchool(name: string) {
  return queryOne<SchoolRow>(
    `INSERT INTO schools (name) VALUES ($1)
     RETURNING id, name, created_at, 0 AS member_count`,
    [name],
  );
}

export function findUser(id: string, db?: Queryable) {
  const sql = `SELECT id, email, role, account_type, account_kind, school_id
               FROM users WHERE id = $1`;
  return db
    ? db.query<OrgUserRow>(sql, [id]).then((r) => r.rows[0] ?? null)
    : queryOne<OrgUserRow>(sql, [id]);
}

/** Classes this user teaches, and classes this user is a member of. */
export async function countClassLinks(
  db: Queryable,
  userId: string,
): Promise<{ teaching: number; member: number }> {
  const res = await db.query<{ teaching: number; member: number }>(
    `SELECT
       (SELECT count(*)::int FROM classes WHERE teacher_id = $1) AS teaching,
       (SELECT count(*)::int FROM class_members WHERE student_id = $1) AS member`,
    [userId],
  );
  return res.rows[0] ?? { teaching: 0, member: 0 };
}

export async function setOrganization(
  db: Queryable,
  userId: string,
  accountKind: AccountKind,
  schoolId: string | null,
): Promise<void> {
  await db.query(
    `UPDATE users SET account_kind = $2, school_id = $3, updated_at = now()
     WHERE id = $1`,
    [userId, accountKind, schoolId],
  );
}

export async function upsertTeacherVerification(
  db: Queryable,
  userId: string,
  method: "school_roster" | "interview",
  verifiedBy: string,
  note: string | null,
): Promise<void> {
  await db.query(
    `INSERT INTO teacher_verifications (user_id, method, verified_by, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE
       SET method = EXCLUDED.method, verified_by = EXCLUDED.verified_by,
           note = EXCLUDED.note, verified_at = now()`,
    [userId, method, verifiedBy, note],
  );
}

export async function isVerifiedTeacher(
  db: Queryable,
  userId: string,
): Promise<boolean> {
  const res = await db.query(
    "SELECT 1 FROM teacher_verifications WHERE user_id = $1",
    [userId],
  );
  return (res.rowCount ?? 0) > 0;
}

export function listClasses() {
  return query<ClassRow>(
    `${CLASS_SELECT} ORDER BY s.name NULLS FIRST, t.email, c.name`,
  );
}

export function listSchoolClasses(schoolId: string) {
  return query<ClassRow>(
    `${CLASS_SELECT} WHERE c.school_id = $1 ORDER BY t.email, c.name`,
    [schoolId],
  );
}

export function findClass(id: string) {
  return queryOne<ClassRow>(`${CLASS_SELECT} WHERE c.id = $1`, [id]);
}

export function createClass(
  teacherId: string,
  schoolId: string | null,
  name: string,
) {
  return queryOne<{ id: string }>(
    `INSERT INTO classes (teacher_id, school_id, name) VALUES ($1, $2, $3)
     RETURNING id`,
    [teacherId, schoolId, name],
  );
}

export async function deleteClass(id: string): Promise<boolean> {
  const rows = await query<{ id: string }>(
    "DELETE FROM classes WHERE id = $1 RETURNING id",
    [id],
  );
  return rows.length > 0;
}

export function listClassMembers(classId: string) {
  return query<ClassMemberRow>(
    `SELECT u.id, u.email, u.display_name
     FROM class_members m JOIN users u ON u.id = m.student_id
     WHERE m.class_id = $1
     ORDER BY u.email`,
    [classId],
  );
}

export function findUsersByIds(ids: string[], db: Queryable) {
  return db
    .query<OrgUserRow>(
      `SELECT id, email, role, account_type, account_kind, school_id
       FROM users WHERE id = ANY($1::uuid[])`,
      [ids],
    )
    .then((r) => r.rows);
}

export function replaceClassMembers(
  classId: string,
  studentIds: string[],
  validate: (db: Queryable) => Promise<void>,
) {
  return withTransaction(async (db) => {
    // Lock the class row so two concurrent edits cannot interleave.
    await db.query("SELECT id FROM classes WHERE id = $1 FOR UPDATE", [
      classId,
    ]);
    await validate(db);
    await db.query("DELETE FROM class_members WHERE class_id = $1", [classId]);
    if (studentIds.length > 0) {
      await db.query(
        `INSERT INTO class_members (class_id, student_id)
         SELECT $1, unnest($2::uuid[])`,
        [classId, studentIds],
      );
    }
  });
}

/** The audiences a user may share their own content with. */
export function classesTaughtBy(userId: string) {
  return query<{ id: string; name: string }>(
    "SELECT id, name FROM classes WHERE teacher_id = $1 ORDER BY name",
    [userId],
  );
}

export function classesJoinedBy(userId: string) {
  return query<{ id: string; name: string }>(
    `SELECT c.id, c.name FROM classes c
     JOIN class_members m ON m.class_id = c.id
     WHERE m.student_id = $1
     ORDER BY c.name`,
    [userId],
  );
}
