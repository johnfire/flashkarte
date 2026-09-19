import { lintConceptGraph, type GraphIssue } from "@flashkarte/shared";
import { getPool, withTransaction } from "../../db/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import * as subjectsRepo from "./subjects.repository";
import * as conceptsRepo from "./concepts.repository";
import * as cardsRepo from "./concept-cards.repository";
import { importSchema, type SubjectImport } from "./subjects.schemas";

/** Advice, not a defect: an import may proceed with these. */
const ADVISORY_CODES = new Set(["TOO_MANY_REQUIRES"]);

function findDuplicateSlugs(concepts: SubjectImport["concepts"]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { slug } of concepts) {
    if (seen.has(slug)) duplicates.add(slug);
    seen.add(slug);
  }
  return [...duplicates];
}

function lintImport(data: SubjectImport): {
  blocking: GraphIssue[];
  advisories: GraphIssue[];
} {
  const issues = lintConceptGraph(
    data.concepts.map(({ slug, kind }) => ({ id: slug, kind })),
    data.edges.map((edge) => ({
      from: edge.from,
      to: edge.to,
      strength: edge.strength,
      reason: edge.reason ?? undefined,
    })),
  );
  return {
    blocking: issues.filter((issue) => !ADVISORY_CODES.has(issue.code)),
    advisories: issues.filter((issue) => ADVISORY_CODES.has(issue.code)),
  };
}

async function assertCardsOwned(userId: string, data: SubjectImport) {
  const requested = [...new Set(data.concepts.flatMap((c) => c.cards))];
  const owned = await cardsRepo.findOwnedCardIds(getPool(), userId, requested);
  if (owned.length !== requested.length) {
    throw new NotFoundError("One or more cards were not found");
  }
}

/**
 * Creates a whole subject (concepts, edges, card links) in one transaction, so
 * a bad import leaves nothing behind. The graph is linted first; defects block
 * the import, advisories are returned alongside the result.
 */
export async function importSubject(userId: string, input: unknown) {
  const data = parse(importSchema, input);
  const duplicates = findDuplicateSlugs(data.concepts);
  if (duplicates.length > 0) {
    throw new ValidationError(
      `Duplicate concept slugs: ${duplicates.join(", ")}`,
    );
  }
  const { blocking, advisories } = lintImport(data);
  if (blocking.length > 0) {
    throw new ValidationError(blocking[0].message, { issues: blocking });
  }
  await assertCardsOwned(userId, data);

  const subject = await withTransaction(async (db) => {
    const created = await subjectsRepo.insertSubject(
      db,
      userId,
      data.title,
      data.description ?? null,
    );
    const idBySlug = new Map<string, string>();
    for (const concept of data.concepts) {
      const row = await conceptsRepo.insertConcept(db, created.id, concept);
      idBySlug.set(concept.slug, row.id);
      await cardsRepo.replaceConceptCards(db, row.id, [
        ...new Set(concept.cards),
      ]);
    }
    for (const edge of data.edges) {
      await conceptsRepo.upsertEdge(db, {
        from_concept: idBySlug.get(edge.from)!,
        to_concept: idBySlug.get(edge.to)!,
        strength: edge.strength,
        reason: edge.reason ?? null,
      });
    }
    return created;
  });
  return {
    subject,
    concept_count: data.concepts.length,
    edge_count: data.edges.length,
    advisories,
  };
}
