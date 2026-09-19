import type { Queryable } from "../../db/queryable";

/** The subset of `cardIds` that the user owns. */
export async function findOwnedCardIds(
  db: Queryable,
  userId: string,
  cardIds: string[],
): Promise<string[]> {
  if (cardIds.length === 0) return [];
  const result = await db.query<{ id: string }>(
    `SELECT id FROM cards WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [userId, cardIds],
  );
  return result.rows.map((row) => row.id);
}

/** Replaces the concept's linked card set in one statement pair (caller wraps a transaction). */
export async function replaceConceptCards(
  db: Queryable,
  conceptId: string,
  cardIds: string[],
): Promise<void> {
  await db.query(`DELETE FROM card_concepts WHERE concept_id = $1`, [
    conceptId,
  ]);
  if (cardIds.length === 0) return;
  await db.query(
    `INSERT INTO card_concepts (card_id, concept_id)
     SELECT card_id, $1 FROM unnest($2::uuid[]) AS card_id`,
    [conceptId, cardIds],
  );
}

export async function listConceptCardIds(
  db: Queryable,
  conceptId: string,
): Promise<string[]> {
  const result = await db.query<{ card_id: string }>(
    `SELECT cc.card_id FROM card_concepts cc
     JOIN cards c ON c.id = cc.card_id
     WHERE cc.concept_id = $1
     ORDER BY c.deck_id, c.position`,
    [conceptId],
  );
  return result.rows.map((row) => row.card_id);
}

export interface ConceptEvidenceRow {
  concept_id: string;
  card_count: number;
  mastered_card_count: number;
}

/**
 * Per-concept study evidence for one learner. Only `basic` cards count: they are
 * the ones that carry spaced-repetition state (diagnostic multiple-choice cards
 * are `basic` too). Branch cards have none, and reading cards are exposure, not
 * evidence, so neither can hold a concept back from being mastered.
 * `stableReps` is bound from the caller (packages/shared STABLE_REPS), never
 * hardcoded, so this can't drift from Courses' and polysemy's threshold.
 */
export async function loadConceptEvidence(
  db: Queryable,
  userId: string,
  subjectId: string,
  stableReps: number,
): Promise<ConceptEvidenceRow[]> {
  const result = await db.query<ConceptEvidenceRow>(
    `SELECT cc.concept_id,
            count(c.id)::int AS card_count,
            count(c.id) FILTER (WHERE p.repetitions >= $3)::int AS mastered_card_count
     FROM concepts k
     JOIN card_concepts cc ON cc.concept_id = k.id
     JOIN cards c ON c.id = cc.card_id AND c.type = 'basic'
     LEFT JOIN card_progress p ON p.card_id = c.id AND p.user_id = $1
     WHERE k.subject_id = $2
     GROUP BY cc.concept_id`,
    [userId, subjectId, stableReps],
  );
  return result.rows;
}
