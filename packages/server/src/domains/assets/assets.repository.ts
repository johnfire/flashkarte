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
const ASSET_SUMMARY =
  "a.id, a.kind, a.description, a.author_kind, length(a.content)::int AS size, a.created_at";

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
    `SELECT ${ASSET_SUMMARY}
     FROM assets a
     JOIN subjects owner ON owner.id = a.subject_id
     JOIN subjects requested ON requested.id = $1
     WHERE a.kind = 'diagram'
       AND (a.subject_id = requested.id
         OR (owner.course_family_id IS NOT NULL AND owner.course_family_id = requested.course_family_id))
     ORDER BY a.created_at, a.id`,
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
    `SELECT count(*)::int AS n FROM assets WHERE subject_id = $1 AND kind = 'diagram'`,
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
    `SELECT ${SUMMARY}, content FROM assets WHERE subject_id = $1 AND id = $2 AND kind = 'diagram'`,
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
  await db.query(
    `DELETE FROM assets WHERE subject_id = $1 AND id = $2 AND kind = 'diagram'`,
    [subjectId, id],
  );
}

/** The SVG of any asset, diagram or formula, for serving. */
export async function findServableSvg(
  db: Queryable,
  subjectId: string,
  id: string,
): Promise<string | null> {
  const result = await db.query<{ content: string }>(
    `SELECT a.content FROM assets a
     JOIN subjects owner ON owner.id = a.subject_id
     JOIN subjects requested ON requested.id = $1
     WHERE a.id = $2
       AND (a.subject_id = requested.id
         OR (owner.course_family_id IS NOT NULL AND owner.course_family_id = requested.course_family_id))`,
    [subjectId, id],
  );
  return result.rows[0]?.content ?? null;
}

export interface FormulaAssetRow {
  id: string;
  width_em: number;
  height_em: number;
  depth_em: number;
}

/** The stored picture of a formula in one style, if it has been drawn before. */
export async function findFormulaAsset(
  db: Queryable,
  subjectId: string,
  latex: string,
  display: boolean,
): Promise<FormulaAssetRow | null> {
  const result = await db.query<FormulaAssetRow>(
    `SELECT id, width_em, height_em, depth_em FROM assets
     WHERE subject_id = $1 AND kind = 'formula' AND display = $2 AND latex = $3`,
    [subjectId, display, latex],
  );
  return result.rows[0] ?? null;
}

export async function insertFormulaAsset(
  db: Queryable,
  input: {
    subjectId: string;
    latex: string;
    display: boolean;
    svg: string;
    widthEm: number;
    heightEm: number;
    depthEm: number;
    authorKind: AssetAuthor;
  },
): Promise<FormulaAssetRow> {
  const result = await db.query<FormulaAssetRow>(
    `INSERT INTO assets (subject_id, kind, content, author_kind, latex, display, width_em, height_em, depth_em)
     VALUES ($1, 'formula', $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (subject_id, display, latex) WHERE kind = 'formula'
       DO UPDATE SET latex = EXCLUDED.latex
     RETURNING id, width_em, height_em, depth_em`,
    [
      input.subjectId,
      input.svg,
      input.authorKind,
      input.latex,
      input.display,
      input.widthEm,
      input.heightEm,
      input.depthEm,
    ],
  );
  return result.rows[0];
}
