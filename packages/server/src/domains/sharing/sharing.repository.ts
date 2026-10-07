import { query, queryOne, withTransaction } from "../../db/client";

export type ShareScope = "school" | "class" | "teacher_students";
export type ShareableType = "deck" | "course" | "subject";

export interface ShareRow {
  scope: ShareScope;
  school_id: string | null;
  class_id: string | null;
}

// Fixed identifiers only — never user input — so interpolating them is safe.
const TABLES: Record<
  ShareableType,
  { shares: string; fk: string; content: string; official: boolean }
> = {
  deck: {
    shares: "deck_shares",
    fk: "deck_id",
    content: "decks",
    official: true,
  },
  course: {
    shares: "course_shares",
    fk: "course_id",
    content: "courses",
    official: false,
  },
  subject: {
    shares: "subject_shares",
    fk: "subject_id",
    content: "subjects",
    official: true,
  },
};

/** The item, if `userId` owns it. App (official) content is flagged. */
export function findOwned(type: ShareableType, userId: string, id: string) {
  const t = TABLES[type];
  const official = t.official ? "is_official" : "false";
  return queryOne<{ id: string; is_official: boolean }>(
    `SELECT id, ${official} AS is_official FROM ${t.content}
     WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export function listShares(type: ShareableType, id: string) {
  const t = TABLES[type];
  return query<ShareRow>(
    `SELECT scope, school_id, class_id FROM ${t.shares}
     WHERE ${t.fk} = $1 ORDER BY scope, created_at`,
    [id],
  );
}

/** Replace every audience of one item in a single transaction. */
export function replaceShares(
  type: ShareableType,
  id: string,
  shares: ShareRow[],
) {
  const t = TABLES[type];
  return withTransaction(async (db) => {
    await db.query(`SELECT id FROM ${t.content} WHERE id = $1 FOR UPDATE`, [
      id,
    ]);
    await db.query(`DELETE FROM ${t.shares} WHERE ${t.fk} = $1`, [id]);
    for (const share of shares) {
      await db.query(
        `INSERT INTO ${t.shares} (${t.fk}, scope, school_id, class_id)
         VALUES ($1, $2, $3, $4)`,
        [id, share.scope, share.school_id, share.class_id],
      );
    }
  });
}
