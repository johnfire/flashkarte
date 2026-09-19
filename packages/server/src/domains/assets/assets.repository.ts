import type { Queryable } from "../../db/queryable";

export type AssetKind = "diagram" | "formula";
export type AssetAuthor = "human" | "ai";

export interface AssetSummaryRow {
  id: string;
  kind: AssetKind;
  description: string | null;
  author_kind: AssetAuthor;
  size: number;
  created_at: string;
}
export interface AssetRow extends AssetSummaryRow {
  content: string;
}

const SUMMARY = `id, kind, description, author_kind, length(content)::int AS size, created_at`;

export async function insertAsset(
  db: Queryable,
  input: {
    subjectId: string;
    kind: AssetKind;
    content: string;
    description: string | null;
    authorKind: AssetAuthor;
  },
): Promise<AssetSummaryRow> {
  const result = await db.query<AssetSummaryRow>(
    `INSERT INTO assets (subject_id, kind, content, description, author_kind)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${SUMMARY}`,
    [
      input.subjectId,
      input.kind,
      input.content,
      input.description,
      input.authorKind,
    ],
  );
  return result.rows[0];
}

export async function listAssets(
  db: Queryable,
  subjectId: string,
): Promise<AssetSummaryRow[]> {
  const result = await db.query<AssetSummaryRow>(
    `SELECT ${SUMMARY} FROM assets WHERE subject_id = $1 ORDER BY created_at, id`,
    [subjectId],
  );
  return result.rows;
}

export async function listAssetIds(
  db: Queryable,
  subjectId: string,
): Promise<string[]> {
  const result = await db.query<{ id: string }>(
    `SELECT id FROM assets WHERE subject_id = $1`,
    [subjectId],
  );
  return result.rows.map((row) => row.id);
}

export async function countAssets(
  db: Queryable,
  subjectId: string,
): Promise<number> {
  const result = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM assets WHERE subject_id = $1`,
    [subjectId],
  );
  return result.rows[0].n;
}

export async function findAsset(
  db: Queryable,
  subjectId: string,
  id: string,
): Promise<AssetRow | null> {
  const result = await db.query<AssetRow>(
    `SELECT ${SUMMARY}, content FROM assets WHERE subject_id = $1 AND id = $2`,
    [subjectId, id],
  );
  return result.rows[0] ?? null;
}

/** Whether any screen (or its history) or question of the subject points at this asset. */
export async function isAssetReferenced(
  db: Queryable,
  subjectId: string,
  id: string,
): Promise<boolean> {
  const needle = `%asset:${id}%`;
  const result = await db.query(
    `SELECT 1 FROM screens s WHERE s.subject_id = $1 AND s.blocks::text LIKE $2
     UNION ALL
     SELECT 1 FROM screen_revisions r JOIN screens s ON s.id = r.screen_id
       WHERE s.subject_id = $1 AND r.blocks::text LIKE $2
     UNION ALL
     SELECT 1 FROM lesson_questions q JOIN lessons l ON l.id = q.lesson_id
       WHERE l.subject_id = $1 AND (q.prompt::text LIKE $2 OR q.options::text LIKE $2)
     LIMIT 1`,
    [subjectId, needle],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function removeAsset(
  db: Queryable,
  subjectId: string,
  id: string,
): Promise<void> {
  await db.query(`DELETE FROM assets WHERE subject_id = $1 AND id = $2`, [
    subjectId,
    id,
  ]);
}
