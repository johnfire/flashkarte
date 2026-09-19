import type { PoolClient } from "pg";
import { wouldCreateCycle } from "@flashkarte/shared";
import { withTransaction } from "../../db/client";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { parse } from "../../utils/validate";
import * as subjectsRepo from "./subjects.repository";
import * as repo from "./concepts.repository";
import * as cardsRepo from "./concept-cards.repository";
import {
  conceptCardIdsSchema,
  conceptPatchSchema,
  edgeSchema,
  newConceptSchema,
} from "./subjects.schemas";
import { toGraphEdges, toPublicEdge, slugById } from "./subject-graph-adapters";

type LockedEdit<T> = (
  db: PoolClient,
  subject: subjectsRepo.SubjectRow,
) => Promise<T>;

/**
 * Runs an edit under the subject's row lock, so concurrent edits to one graph
 * are serialised (see lockOwnedSubject). Not found and not yours look the same.
 */
async function withLockedSubject<T>(
  userId: string,
  subjectId: string,
  edit: LockedEdit<T>,
): Promise<T> {
  return withTransaction(async (db) => {
    const subject = await subjectsRepo.lockOwnedSubject(db, userId, subjectId);
    if (!subject) throw new NotFoundError("Subject not found");
    return edit(db, subject);
  });
}

async function requireConcept(db: PoolClient, subjectId: string, slug: string) {
  const concept = await repo.findConceptBySlug(db, subjectId, slug);
  if (!concept) throw new NotFoundError(`Concept "${slug}" not found`);
  return concept;
}

export async function addConcept(
  userId: string,
  subjectId: string,
  input: unknown,
) {
  const fields = parse(newConceptSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const existing = await repo.findConceptBySlug(db, subject.id, fields.slug);
    if (existing) {
      throw new ConflictError(`A concept "${fields.slug}" already exists`);
    }
    const created = await repo.insertConcept(db, subject.id, fields);
    await subjectsRepo.bumpSubjectVersion(db, subject.id);
    return created;
  });
}

export async function updateConcept(
  userId: string,
  subjectId: string,
  slug: string,
  patchInput: unknown,
) {
  const patch = parse(conceptPatchSchema, patchInput);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const current = await requireConcept(db, subject.id, slug);
    const updated = await repo.writeConcept(db, current.id, {
      name: patch.name ?? current.name,
      kind: patch.kind ?? current.kind,
      tier: patch.tier ?? current.tier,
    });
    await subjectsRepo.bumpSubjectVersion(db, subject.id);
    return updated;
  });
}

export function deleteConcept(userId: string, subjectId: string, slug: string) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const current = await requireConcept(db, subject.id, slug);
    await repo.removeConcept(db, current.id);
    await subjectsRepo.bumpSubjectVersion(db, subject.id);
  });
}

/** Adds or updates one prerequisite edge; rejects anything that would create a cycle. */
export async function setEdge(
  userId: string,
  subjectId: string,
  input: unknown,
) {
  const edge = parse(edgeSchema, input);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const from = await requireConcept(db, subject.id, edge.from);
    const to = await requireConcept(db, subject.id, edge.to);
    const existing = toGraphEdges(await repo.listEdges(db, subject.id));
    if (wouldCreateCycle(existing, from.id, to.id)) {
      throw new ValidationError(
        `"${edge.from}" cannot be a prerequisite of "${edge.to}": that would create a cycle`,
      );
    }
    const row: repo.EdgeRow = {
      from_concept: from.id,
      to_concept: to.id,
      strength: edge.strength,
      reason: edge.reason ?? null,
    };
    await repo.upsertEdge(db, row);
    await subjectsRepo.bumpSubjectVersion(db, subject.id);
    return toPublicEdge(row, slugById([from, to]));
  });
}

export function removeEdge(
  userId: string,
  subjectId: string,
  fromSlug: string,
  toSlug: string,
) {
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const from = await requireConcept(db, subject.id, fromSlug);
    const to = await requireConcept(db, subject.id, toSlug);
    const removed = await repo.removeEdge(db, from.id, to.id);
    if (!removed) throw new NotFoundError("That edge does not exist");
    await subjectsRepo.bumpSubjectVersion(db, subject.id);
  });
}

/** Replaces the cards that assess a concept. Every card must belong to the caller. */
export async function linkCards(
  userId: string,
  subjectId: string,
  slug: string,
  cardIdsInput: unknown,
) {
  const requested = [...new Set(parse(conceptCardIdsSchema, cardIdsInput))];
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    const concept = await requireConcept(db, subject.id, slug);
    const owned = await cardsRepo.findOwnedCardIds(db, userId, requested);
    if (owned.length !== requested.length) {
      throw new NotFoundError("One or more cards were not found");
    }
    await cardsRepo.replaceConceptCards(db, concept.id, requested);
    return { concept: slug, card_ids: requested };
  });
}
