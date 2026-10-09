import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { signUpVerifyAndSignIn } from "./support";

const database = process.env.POSTGRES_DB ?? "flashkarte";
if (!database.endsWith("_test") && !process.env.CI)
  throw new Error(
    "School roster E2E requires an isolated _test database locally",
  );

const pool = new Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database,
  user: process.env.POSTGRES_USER ?? "flashkarte",
  password: process.env.POSTGRES_PASSWORD ?? "flashkarte",
});

test.afterAll(() => pool.end());

test("an administrator opens a school and sees its roster and class participants", async ({
  page,
}) => {
  const stamp = Date.now();
  const adminEmail = `school-admin-${stamp}@example.com`;
  await signUpVerifyAndSignIn(page, adminEmail);
  const admin = await pool.query<{ id: string }>(
    "UPDATE users SET account_type = 'admin' WHERE email = $1 RETURNING id",
    [adminEmail],
  );
  const school = await pool.query<{ id: string }>(
    "INSERT INTO schools (name) VALUES ($1) RETURNING id",
    [`Language School ${stamp}`],
  );
  const schoolId = school.rows[0].id;
  const members = await pool.query<{ id: string; email: string }>(
    `INSERT INTO users (email, password_hash, account_kind, school_id)
     VALUES
       ($1, 'x', 'school', $4),
       ($2, 'x', 'teacher', $4),
       ($3, 'x', 'student', $4)
     RETURNING id, email`,
    [
      `office-${stamp}@example.com`,
      `teacher-${stamp}@example.com`,
      `student-${stamp}@example.com`,
      schoolId,
    ],
  );
  const teacherId = members.rows.find((member) =>
    member.email.startsWith("teacher-"),
  )!.id;
  const studentId = members.rows.find((member) =>
    member.email.startsWith("student-"),
  )!.id;
  await pool.query(
    `INSERT INTO teacher_verifications (user_id, method, verified_by)
     VALUES ($1, 'school_roster', $2)`,
    [teacherId, admin.rows[0].id],
  );
  const schoolClass = await pool.query<{ id: string }>(
    `INSERT INTO classes (teacher_id, school_id, name)
     VALUES ($1, $2, 'German A1') RETURNING id`,
    [teacherId, schoolId],
  );
  await pool.query(
    "INSERT INTO class_members (class_id, student_id) VALUES ($1, $2)",
    [schoolClass.rows[0].id, studentId],
  );

  await page.reload();
  await page.getByRole("link", { name: "Admin", exact: true }).click();
  const schoolRow = page
    .getByRole("listitem")
    .filter({ hasText: `Language School ${stamp}` });
  await schoolRow
    .getByRole("link", { name: "View school", exact: true })
    .click();

  await expect(
    page.getByRole("heading", { name: `Language School ${stamp}` }),
  ).toBeVisible();
  await expect(page.getByText(`office-${stamp}@example.com`)).toBeVisible();
  await expect(
    page.getByText(`teacher-${stamp}@example.com`, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(`student-${stamp}@example.com`, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View participants" }).click();
  await expect(
    page.getByText(`student-${stamp}@example.com`, { exact: true }),
  ).toHaveCount(2);
});
