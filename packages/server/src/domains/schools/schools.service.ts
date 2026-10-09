import { z } from "zod";
import { withTransaction } from "../../db/client";
import type { Queryable } from "../../db/queryable";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { parse } from "../../utils/validate";
import * as repo from "./schools.repository";
import type { AccountKind } from "./schools.repository";

export const ACCOUNT_KINDS = [
  "individual",
  "school",
  "teacher",
  "student",
] as const;

const MAX_CLASS_MEMBERS = 500;

const nameSchema = z
  .string({ error: "Name is required" })
  .trim()
  .min(1, "Name is required")
  .max(200, "Name must be at most 200 characters");
const idSchema = z.uuid({ error: "Invalid id" });
const nullableIdSchema = z.preprocess(
  (v) => (v === undefined || v === "" ? null : v),
  idSchema.nullable(),
);

const organizationSchema = z.object({
  accountKind: z.enum(ACCOUNT_KINDS, {
    error: `Account kind must be one of: ${ACCOUNT_KINDS.join(", ")}`,
  }),
  schoolId: nullableIdSchema,
});

const verificationSchema = z.object({
  method: z.enum(["school_roster", "interview"], {
    error: "Method must be school_roster or interview",
  }),
  schoolId: nullableIdSchema,
  note: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim() : null),
    z.string().max(1000, "Note must be at most 1000 characters").nullable(),
  ),
});

const classInputSchema = z.object({
  teacherId: idSchema,
  name: nameSchema,
});

const membersSchema = z
  .array(idSchema, { error: "studentIds must be a list of ids" })
  .max(
    MAX_CLASS_MEMBERS,
    `A class can have at most ${MAX_CLASS_MEMBERS} students`,
  );

export interface School {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  teacherId: string;
  teacherEmail: string;
  schoolId: string | null;
  schoolName: string | null;
  memberCount: number;
  createdAt: string;
}

export interface SchoolMember {
  id: string;
  email: string;
  accountType: string;
  accountKind: AccountKind;
  teacherVerified: boolean;
  emailVerifiedAt: string | null;
  classes: { id: string; name: string }[];
}

export interface SchoolDetail {
  school: School;
  administrators: SchoolMember[];
  teachers: SchoolMember[];
  students: SchoolMember[];
  classes: SchoolClass[];
}

function toSchool(row: repo.SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    memberCount: Number(row.member_count),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function toClass(row: repo.ClassRow): SchoolClass {
  return {
    id: row.id,
    name: row.name,
    teacherId: row.teacher_id,
    teacherEmail: row.teacher_email,
    schoolId: row.school_id,
    schoolName: row.school_name,
    memberCount: Number(row.member_count),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listSchools(): Promise<School[]> {
  return (await repo.listSchools()).map(toSchool);
}

function toSchoolMember(row: repo.SchoolMemberRow): SchoolMember {
  return {
    id: row.id,
    email: row.email,
    accountType: row.account_type,
    accountKind: row.account_kind,
    teacherVerified: row.teacher_verified,
    emailVerifiedAt: row.email_verified_at
      ? new Date(row.email_verified_at).toISOString()
      : null,
    classes: row.class_links,
  };
}

/** Return one school's roster, grouped by its school-login, teacher and student accounts. */
export async function getSchool(idIn: string): Promise<SchoolDetail> {
  const id = parse(idSchema, idIn);
  const schoolRow = await repo.findSchoolDetail(id);
  if (!schoolRow) throw new NotFoundError("School not found");

  const [memberRows, classRows] = await Promise.all([
    repo.listSchoolMembers(id),
    repo.listSchoolClasses(id),
  ]);
  const members = memberRows.map(toSchoolMember);
  return {
    school: toSchool(schoolRow),
    administrators: members.filter((member) => member.accountKind === "school"),
    teachers: members.filter((member) => member.accountKind === "teacher"),
    students: members.filter((member) => member.accountKind === "student"),
    classes: classRows.map(toClass),
  };
}

export async function createSchool(nameIn: unknown): Promise<School> {
  const name = parse(nameSchema, nameIn);
  const row = await repo.createSchool(name);
  if (!row) throw new Error("Failed to create school");
  return toSchool(row);
}

/**
 * Refuse a change that would leave classes pointing at someone who no longer
 * fits them. The admin removes or reassigns the classes first, deliberately,
 * instead of this silently cutting students off.
 */
async function assertClassLinksSurvive(
  db: Queryable,
  user: repo.OrgUserRow,
  nextKind: AccountKind,
  nextSchoolId: string | null,
): Promise<void> {
  const links = await repo.countClassLinks(db, user.id);
  const schoolChanges = nextSchoolId !== user.school_id;
  if (links.teaching > 0 && (nextKind !== "teacher" || schoolChanges)) {
    throw new ConflictError(
      "This teacher still has classes. Delete their classes first.",
    );
  }
  if (links.member > 0 && (nextKind !== "student" || schoolChanges)) {
    throw new ConflictError(
      "This student is still in classes. Remove them from their classes first.",
    );
  }
}

async function lockUser(db: Queryable, userId: string) {
  await db.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
  const user = await repo.findUser(userId, db);
  if (!user) throw new NotFoundError("User not found");
  if (user.role === "system") {
    throw new ValidationError("The system account cannot be changed");
  }
  return user;
}

async function assertSchoolExists(schoolId: string | null): Promise<void> {
  if (schoolId && !(await repo.findSchool(schoolId))) {
    throw new NotFoundError("School not found");
  }
}

/** Admin: set a user's kind (individual, school, student) and school. */
export async function setOrganization(
  userId: string,
  input: unknown,
): Promise<void> {
  const { accountKind, schoolId } = parse(organizationSchema, input);
  if (accountKind === "individual" && schoolId) {
    throw new ValidationError(
      "An individual account cannot belong to a school",
    );
  }
  if (accountKind === "school" && !schoolId) {
    throw new ValidationError("A school account must belong to a school");
  }
  await assertSchoolExists(schoolId);

  await withTransaction(async (db) => {
    const user = await lockUser(db, userId);
    if (user.account_type === "admin" && accountKind !== "individual") {
      throw new ValidationError("An admin account must stay an individual");
    }
    if (
      accountKind === "teacher" &&
      !(await repo.isVerifiedTeacher(db, userId))
    ) {
      throw new ValidationError(
        "Verify this person as a teacher before making them one",
      );
    }
    await assertClassLinksSurvive(db, user, accountKind, schoolId);
    await repo.setOrganization(db, userId, accountKind, schoolId);
  });
}

/**
 * Admin: record how a teacher proved they are one, and make them a teacher.
 * A school roster names their school; an interview may leave them independent.
 */
export async function verifyTeacher(
  adminId: string,
  userId: string,
  input: unknown,
): Promise<void> {
  const { method, schoolId, note } = parse(verificationSchema, input);
  if (method === "school_roster" && !schoolId) {
    throw new ValidationError("A school roster verification needs the school");
  }
  await assertSchoolExists(schoolId);

  await withTransaction(async (db) => {
    const user = await lockUser(db, userId);
    if (user.account_type === "admin") {
      throw new ValidationError("An admin account must stay an individual");
    }
    await assertClassLinksSurvive(db, user, "teacher", schoolId);
    await repo.upsertTeacherVerification(db, userId, method, adminId, note);
    await repo.setOrganization(db, userId, "teacher", schoolId);
  });
}

export async function listClasses(): Promise<SchoolClass[]> {
  return (await repo.listClasses()).map(toClass);
}

export async function getClass(id: string) {
  const parsedId = parse(idSchema, id);
  const row = await repo.findClass(parsedId);
  if (!row) throw new NotFoundError("Class not found");
  const members = await repo.listClassMembers(parsedId);
  return {
    ...toClass(row),
    members: members.map((m) => ({
      id: m.id,
      email: m.email,
      displayName: m.display_name,
    })),
  };
}

/** Admin: create a class for a teacher. It belongs to the teacher's school, if any. */
export async function createClass(input: unknown): Promise<SchoolClass> {
  const { teacherId, name } = parse(classInputSchema, input);
  const teacher = await repo.findUser(teacherId);
  if (!teacher) throw new NotFoundError("Teacher not found");
  if (teacher.account_kind !== "teacher") {
    throw new ValidationError("Only a teacher can have classes");
  }
  const created = await repo.createClass(teacherId, teacher.school_id, name);
  if (!created) throw new Error("Failed to create class");
  const row = await repo.findClass(created.id);
  if (!row) throw new Error("Failed to read new class");
  return toClass(row);
}

export async function deleteClass(id: string): Promise<void> {
  const parsedId = parse(idSchema, id);
  if (!(await repo.deleteClass(parsedId))) {
    throw new NotFoundError("Class not found");
  }
}

/**
 * Admin: replace a class's students. Every one must be a student account; a
 * school's class takes only that school's students. All-or-nothing: one bad id
 * rejects the whole list, so a class is never left half-updated.
 */
export async function setClassMembers(
  classIdIn: string,
  studentIdsIn: unknown,
): Promise<void> {
  const classId = parse(idSchema, classIdIn);
  const studentIds = [...new Set(parse(membersSchema, studentIdsIn))];
  const schoolClass = await repo.findClass(classId);
  if (!schoolClass) throw new NotFoundError("Class not found");

  await repo.replaceClassMembers(classId, studentIds, async (db) => {
    const users = await repo.findUsersByIds(studentIds, db);
    const byId = new Map(users.map((u) => [u.id, u]));
    const problems: string[] = [];
    for (const id of studentIds) {
      const user = byId.get(id);
      if (!user) problems.push(`${id}: no such user`);
      else if (user.account_kind !== "student")
        problems.push(`${user.email}: not a student account`);
      else if (
        schoolClass.school_id &&
        user.school_id !== schoolClass.school_id
      )
        problems.push(`${user.email}: not in this class's school`);
    }
    if (problems.length > 0) {
      throw new ValidationError(
        `Some students cannot join this class: ${problems.join("; ")}`,
        { problems },
      );
    }
  });
}

export interface ShareOptions {
  accountKind: AccountKind;
  school: { id: string; name: string } | null;
  classes: { id: string; name: string }[];
  canShareWithSchool: boolean;
  canShareWithAllStudents: boolean;
}

/**
 * Who this user may share their own content with:
 * - school login: its school;
 * - teacher: their students (all, or one class) and their school, if any;
 * - student: a class they are in (their classmates);
 * - individual: nobody beyond "everyone" (public), which is handled elsewhere.
 */
export async function getShareOptions(userId: string): Promise<ShareOptions> {
  const user = await repo.findUser(userId);
  if (!user) throw new NotFoundError("User not found");
  const school =
    user.school_id &&
    (user.account_kind === "school" || user.account_kind === "teacher")
      ? await repo.findSchool(user.school_id)
      : null;
  const classes =
    user.account_kind === "teacher"
      ? await repo.classesTaughtBy(userId)
      : user.account_kind === "student"
        ? await repo.classesJoinedBy(userId)
        : [];
  return {
    accountKind: user.account_kind,
    school,
    classes,
    canShareWithSchool: school !== null,
    canShareWithAllStudents: user.account_kind === "teacher",
  };
}
