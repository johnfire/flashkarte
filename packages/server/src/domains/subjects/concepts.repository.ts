import type {
  ConceptKind,
  ConceptTier,
  EdgeStrength,
} from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";

export interface ConceptRow {
  id: string;
  subject_id: string;
  slug: string;
  name: string;
  kind: ConceptKind;
  tier: ConceptTier;
  position: number;
}

const CONCEPT_COLS = "id, subject_id, slug, name, kind, tier, position";

export interface ConceptFields {
  slug: string;
  name: string;
  kind: ConceptKind;
  tier: ConceptTier;
}

export async function insertConcept(
  db: Queryable,
  subjectId: string,
  fields: ConceptFields,
): Promise<ConceptRow> {
  const result = await db.query<ConceptRow>(
    `INSERT INTO concepts (subject_id, slug, name, kind, tier, position)
     VALUES ($1, $2, $3, $4, $5,
             (SELECT COALESCE(MAX(position), -1) + 1 FROM concepts WHERE subject_id = $1))
     RETURNING ${CONCEPT_COLS}`,
    [subjectId, fields.slug, fields.name, fields.kind, fields.tier],
  );
  return result.rows[0];
}

export async function listConcepts(
  db: Queryable,
  subjectId: string,
): Promise<ConceptRow[]> {
  const result = await db.query<ConceptRow>(
    `SELECT ${CONCEPT_COLS} FROM concepts WHERE subject_id = $1 ORDER BY position ASC`,
    [subjectId],
  );
  return result.rows;
}

export async function findConceptBySlug(
  db: Queryable,
  subjectId: string,
  slug: string,
): Promise<ConceptRow | null> {
  const result = await db.query<ConceptRow>(
    `SELECT ${CONCEPT_COLS} FROM concepts WHERE subject_id = $1 AND slug = $2`,
    [subjectId, slug],
  );
  return result.rows[0] ?? null;
}

export async function writeConcept(
  db: Queryable,
  id: string,
  next: Pick<ConceptFields, "name" | "kind" | "tier">,
): Promise<ConceptRow> {
  const result = await db.query<ConceptRow>(
    `UPDATE concepts SET name = $2, kind = $3, tier = $4 WHERE id = $1
     RETURNING ${CONCEPT_COLS}`,
    [id, next.name, next.kind, next.tier],
  );
  return result.rows[0];
}

export async function removeConcept(db: Queryable, id: string): Promise<void> {
  await db.query(`DELETE FROM concepts WHERE id = $1`, [id]);
}

export interface EdgeRow {
  from_concept: string;
  to_concept: string;
  strength: EdgeStrength;
  reason: string | null;
}

/** Edges whose dependent end belongs to the subject. */
export async function listEdges(
  db: Queryable,
  subjectId: string,
): Promise<EdgeRow[]> {
  const result = await db.query<EdgeRow>(
    `SELECT e.from_concept, e.to_concept, e.strength, e.reason
     FROM concept_edges e
     JOIN concepts c ON c.id = e.to_concept
     WHERE c.subject_id = $1
     ORDER BY c.position ASC, e.created_at ASC`,
    [subjectId],
  );
  return result.rows;
}

export async function upsertEdge(db: Queryable, edge: EdgeRow): Promise<void> {
  await db.query(
    `INSERT INTO concept_edges (from_concept, to_concept, strength, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (from_concept, to_concept)
     DO UPDATE SET strength = EXCLUDED.strength, reason = EXCLUDED.reason`,
    [edge.from_concept, edge.to_concept, edge.strength, edge.reason],
  );
}

export async function removeEdge(
  db: Queryable,
  fromConcept: string,
  toConcept: string,
): Promise<boolean> {
  const result = await db.query(
    `DELETE FROM concept_edges WHERE from_concept = $1 AND to_concept = $2`,
    [fromConcept, toConcept],
  );
  return (result.rowCount ?? 0) > 0;
}
