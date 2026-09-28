import { query } from "../../db/client";
import type { Queryable } from "../../db/queryable";
import type { SubjectSummaryRow } from "../subjects/subjects.repository";

export interface CourseCollectionRow {
  id: string;
  title: string;
  description: string | null;
  is_official: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseCollectionSummaryRow extends CourseCollectionRow {
  course_count: number;
}

const COLLECTION_COLS =
  "id, title, description, is_official, created_at, updated_at";
const COLLECTION_SUMMARY_COLS =
  "cc.id, cc.title, cc.description, cc.is_official, cc.created_at, cc.updated_at";
const SUBJECT_SUMMARY_COLS =
  "s.id, s.reference_number, s.user_id, s.title, s.description, s.is_public, s.is_official, s.version, s.created_at, s.updated_at, s.locale, s.course_collection_id, s.course_collection_position";

export function listCatalogCollections(isOfficial: boolean, language?: string) {
  return query<CourseCollectionSummaryRow>(
    `SELECT ${COLLECTION_SUMMARY_COLS}, count(s.id)::int AS course_count
     FROM course_collections cc
     JOIN subjects s ON s.course_collection_id = cc.id
     WHERE cc.is_official = $1
       AND s.is_public
       AND s.is_official = $1
       AND ($2::text IS NULL OR s.locale = $2 OR s.locale LIKE $2 || '-%')
     GROUP BY cc.id
     ORDER BY cc.title COLLATE de_phonebook ASC`,
    [isOfficial, language ?? null],
  );
}

export async function findCatalogCollection(
  id: string,
  isOfficial: boolean,
): Promise<CourseCollectionRow | null> {
  const rows = await query<CourseCollectionRow>(
    `SELECT ${COLLECTION_COLS} FROM course_collections
     WHERE id = $1 AND is_official = $2`,
    [id, isOfficial],
  );
  return rows[0] ?? null;
}

export function listCatalogCourses(
  collectionId: string,
  isOfficial: boolean,
  language?: string,
) {
  return query<SubjectSummaryRow>(
    `SELECT ${SUBJECT_SUMMARY_COLS},
            (SELECT count(*) FROM concepts c WHERE c.subject_id = s.id)::int AS concept_count
     FROM subjects s
     WHERE s.course_collection_id = $1
       AND s.is_public
       AND s.is_official = $2
       AND ($3::text IS NULL OR s.locale = $3 OR s.locale LIKE $3 || '-%')
     ORDER BY s.course_collection_position NULLS LAST, s.title COLLATE de_phonebook ASC`,
    [collectionId, isOfficial, language ?? null],
  );
}

export async function createCollection(
  db: Queryable,
  fields: { title: string; description: string | null; isOfficial: boolean },
): Promise<CourseCollectionRow> {
  const rows = await db.query<CourseCollectionRow>(
    `INSERT INTO course_collections (title, description, is_official)
     VALUES ($1, $2, $3) RETURNING ${COLLECTION_COLS}`,
    [fields.title, fields.description, fields.isOfficial],
  );
  return rows.rows[0];
}

export async function findCollectionForUpdate(
  db: Queryable,
  id: string,
): Promise<CourseCollectionRow | null> {
  const rows = await db.query<CourseCollectionRow>(
    `SELECT ${COLLECTION_COLS} FROM course_collections WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return rows.rows[0] ?? null;
}

export async function setSubjectCollection(
  db: Queryable,
  subjectId: string,
  collectionId: string | null,
  position: number | null,
): Promise<boolean> {
  const changed = await db.query(
    `UPDATE subjects
     SET course_collection_id = $2,
         course_collection_position = $3,
         updated_at = now()
     WHERE id = $1`,
    [subjectId, collectionId, position],
  );
  return (changed.rowCount ?? 0) > 0;
}

export async function findSubjectSource(
  db: Queryable,
  subjectId: string,
): Promise<boolean | null> {
  const rows = await db.query<{ is_official: boolean }>(
    "SELECT is_official FROM subjects WHERE id = $1 FOR UPDATE",
    [subjectId],
  );
  return rows.rows[0]?.is_official ?? null;
}

export function listUngroupedCatalogSubjects(
  isOfficial: boolean,
  language?: string,
) {
  return query<SubjectSummaryRow>(
    `SELECT ${SUBJECT_SUMMARY_COLS},
            (SELECT count(*) FROM concepts c WHERE c.subject_id = s.id)::int AS concept_count
     FROM subjects s
     WHERE s.is_public
       AND s.is_official = $1
       AND s.course_collection_id IS NULL
       AND ($2::text IS NULL OR s.locale = $2 OR s.locale LIKE $2 || '-%')
     ORDER BY s.title COLLATE de_phonebook ASC`,
    [isOfficial, language ?? null],
  );
}

export const courseCollectionsRepository = {
  createCollection,
  findCatalogCollection,
  findCollectionForUpdate,
  findSubjectSource,
  listCatalogCollections,
  listCatalogCourses,
  listUngroupedCatalogSubjects,
  setSubjectCollection,
};
