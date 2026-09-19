import { normalizeScreenNumber } from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";

export type AuthorKind = "human" | "ai";

export interface ScreenRow {
  id: string;
  subject_id: string;
  lesson_id: string;
  /** Canonical spelling (numeric comes back as stored, so it is normalised here). */
  number: string;
  blocks: unknown;
  author_kind: AuthorKind;
  sources: unknown;
  retired_at: string | null;
}

interface RawScreenRow extends Omit<ScreenRow, "number"> {
  number: string;
}

const SCREEN_COLS =
  "s.id, s.subject_id, s.lesson_id, s.number, s.blocks, s.author_kind, s.sources, s.retired_at";

const toScreen = (row: RawScreenRow): ScreenRow => ({
  ...row,
  number: normalizeScreenNumber(row.number),
});

/** A lesson's screens in number order, retired ones included (callers filter). */
export async function listScreens(
  db: Queryable,
  lessonId: string,
): Promise<ScreenRow[]> {
  const result = await db.query<RawScreenRow>(
    // Qualified column: an output alias called "number" would sort as text, "10" before "9".
    `SELECT ${SCREEN_COLS} FROM screens s WHERE s.lesson_id = $1 ORDER BY s.number ASC`,
    [lessonId],
  );
  return result.rows.map(toScreen);
}

export async function findScreenByNumber(
  db: Queryable,
  subjectId: string,
  number: string,
): Promise<ScreenRow | null> {
  const result = await db.query<RawScreenRow>(
    `SELECT ${SCREEN_COLS} FROM screens s WHERE s.subject_id = $1 AND s.number = $2::numeric`,
    [subjectId, number],
  );
  return result.rows[0] ? toScreen(result.rows[0]) : null;
}

/** The nearest existing number above `number` in the subject, or null. */
export async function nextNumberAfter(
  db: Queryable,
  subjectId: string,
  number: string,
): Promise<string | null> {
  const result = await db.query<{ number: string }>(
    `SELECT s.number FROM screens s
     WHERE s.subject_id = $1 AND s.number > $2::numeric ORDER BY s.number ASC LIMIT 1`,
    [subjectId, number],
  );
  return result.rows[0] ? normalizeScreenNumber(result.rows[0].number) : null;
}

/** The nearest existing number below `number` in the subject, or null. */
export async function previousNumberBefore(
  db: Queryable,
  subjectId: string,
  number: string,
): Promise<string | null> {
  const result = await db.query<{ number: string }>(
    `SELECT s.number FROM screens s
     WHERE s.subject_id = $1 AND s.number < $2::numeric ORDER BY s.number DESC LIMIT 1`,
    [subjectId, number],
  );
  return result.rows[0] ? normalizeScreenNumber(result.rows[0].number) : null;
}

export async function highestNumber(
  db: Queryable,
  subjectId: string,
  lessonId?: string,
): Promise<string | null> {
  const result = await db.query<{ number: string | null }>(
    `SELECT MAX(s.number) AS number FROM screens s
     WHERE s.subject_id = $1 AND ($2::uuid IS NULL OR s.lesson_id = $2)`,
    [subjectId, lessonId ?? null],
  );
  const value = result.rows[0]?.number;
  return value ? normalizeScreenNumber(value) : null;
}

export async function insertScreen(
  db: Queryable,
  fields: {
    subjectId: string;
    lessonId: string;
    number: string;
    blocks: unknown;
    authorKind: AuthorKind;
    sources: unknown;
  },
): Promise<ScreenRow> {
  const result = await db.query<RawScreenRow>(
    `INSERT INTO screens (subject_id, lesson_id, number, blocks, author_kind, sources)
     VALUES ($1, $2, $3::numeric, $4::jsonb, $5, $6::jsonb)
     RETURNING id, subject_id, lesson_id, number, blocks, author_kind, sources, retired_at`,
    [
      fields.subjectId,
      fields.lessonId,
      fields.number,
      JSON.stringify(fields.blocks),
      fields.authorKind,
      fields.sources === undefined || fields.sources === null
        ? null
        : JSON.stringify(fields.sources),
    ],
  );
  return toScreen(result.rows[0]);
}

/** Changes a screen's content, keeping the previous blocks as a revision. */
export async function writeScreenBlocks(
  db: Queryable,
  screen: ScreenRow,
  blocks: unknown,
): Promise<void> {
  await db.query(
    `INSERT INTO screen_revisions (screen_id, blocks, change) VALUES ($1, $2::jsonb, 'edited')`,
    [screen.id, JSON.stringify(screen.blocks)],
  );
  await db.query(
    `UPDATE screens SET blocks = $2::jsonb, updated_at = now() WHERE id = $1`,
    [screen.id, JSON.stringify(blocks)],
  );
}

export async function writeScreenNumber(
  db: Queryable,
  id: string,
  number: string,
): Promise<void> {
  await db.query(
    `UPDATE screens SET number = $2::numeric, updated_at = now() WHERE id = $1`,
    [id, number],
  );
}

export async function retireScreen(
  db: Queryable,
  screen: ScreenRow,
): Promise<void> {
  await db.query(
    `INSERT INTO screen_revisions (screen_id, blocks, change) VALUES ($1, $2::jsonb, 'retired')`,
    [screen.id, JSON.stringify(screen.blocks)],
  );
  await db.query(
    `UPDATE screens SET retired_at = now(), updated_at = now() WHERE id = $1`,
    [screen.id],
  );
}

export async function removeScreen(db: Queryable, id: string): Promise<void> {
  await db.query(`DELETE FROM screens WHERE id = $1`, [id]);
}

export interface RevisionRow {
  blocks: unknown;
  change: "edited" | "retired";
  changed_at: string;
}

export async function listRevisions(
  db: Queryable,
  screenId: string,
): Promise<RevisionRow[]> {
  const result = await db.query<RevisionRow>(
    `SELECT blocks, change, changed_at FROM screen_revisions
     WHERE screen_id = $1 ORDER BY changed_at ASC, id ASC`,
    [screenId],
  );
  return result.rows;
}
