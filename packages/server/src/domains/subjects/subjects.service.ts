import {
  STABLE_REPS,
  computeConceptStatuses,
  lintConceptGraph,
  studyFrontier,
  topologicalOrder,
  type ConceptEvidence,
} from "@flashkarte/shared";
import { getPool, withTransaction } from "../../db/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import * as repo from "./subjects.repository";
import * as conceptsRepo from "./concepts.repository";
import {
  loadConceptEvidence,
  loadConceptLessons,
  type ConceptLessonRow,
} from "./concept-cards.repository";
import {
  descriptionSchema,
  editionSchema,
  localeSchema,
  titleSchema,
} from "./subjects.schemas";
import {
  slugById,
  toGraphEdges,
  toGraphNodes,
  toPublicEdge,
} from "./subject-graph-adapters";

export async function requireOwnedSubject(userId: string, id: string) {
  const subject = await repo.findOwnedSubject(userId, id);
  if (!subject) throw new NotFoundError("Subject not found");
  return subject;
}

export async function requireLearningSubject(userId: string, id: string) {
  const subject = await repo.findLearningSubject(userId, id);
  if (!subject) throw new NotFoundError("Subject not found");
  return subject;
}

export async function enrollInPublicSubject(userId: string, id: string) {
  if (!(await repo.enrollInPublicSubject(userId, id))) {
    const existing = await repo.findLearningSubject(userId, id);
    if (!existing) throw new NotFoundError("Course not found");
  }
}

export async function createSubject(
  userId: string,
  titleInput: unknown,
  descriptionInput: unknown = null,
) {
  const title = parse(titleSchema, titleInput);
  const description = parse(descriptionSchema, descriptionInput ?? null);
  return repo.insertSubject(getPool(), userId, title, description);
}

/** Promote an existing subject into a course family's canonical edition. */
export async function createCourseFamily(
  userId: string,
  subjectId: string,
  localeInput: unknown,
) {
  const locale = parse(localeSchema, localeInput);
  return withTransaction(async (db) => {
    const subject = await repo.lockOwnedSubject(db, userId, subjectId);
    if (!subject) throw new NotFoundError("Subject not found");
    if (subject.course_family_id) {
      throw new ValidationError("Subject already belongs to a course family");
    }
    const family = await repo.createCourseFamily(
      db,
      userId,
      subject.id,
      locale,
    );
    const edition = await repo.setCourseEdition(
      db,
      subject.id,
      family.id,
      locale,
    );
    return { family, edition };
  });
}

/** Clone a canonical graph into a locale edition; lesson content is authored separately. */
export async function createLocalizedEdition(
  userId: string,
  canonicalSubjectId: string,
  input: unknown,
) {
  const fields = parse(editionSchema, input);
  return withTransaction(async (db) => {
    const canonical = await repo.lockOwnedSubject(
      db,
      userId,
      canonicalSubjectId,
    );
    if (!canonical) throw new NotFoundError("Subject not found");
    const family = await repo.findCourseFamilyBySubject(
      db,
      userId,
      canonical.id,
    );
    if (!family || family.canonical_subject_id !== canonical.id) {
      throw new ValidationError("Subject is not a canonical course edition");
    }
    const [sourceConcepts, sourceEdges, existingEditions] = await Promise.all([
      conceptsRepo.listConcepts(db, canonical.id),
      conceptsRepo.listEdges(db, canonical.id),
      repo.listCourseEditions(db, family.id),
    ]);
    if (existingEditions.some((edition) => edition.locale === fields.locale)) {
      throw new ValidationError(
        `Course already has a ${fields.locale} edition`,
      );
    }
    const sourceSlugs = new Set(sourceConcepts.map((concept) => concept.slug));
    const translatedSlugs = Object.keys(fields.concept_names);
    if (
      translatedSlugs.length !== sourceSlugs.size ||
      translatedSlugs.some((slug) => !sourceSlugs.has(slug))
    ) {
      throw new ValidationError(
        "concept_names must name every canonical concept exactly once",
      );
    }
    const edition = await repo.insertSubject(
      db,
      userId,
      fields.title,
      fields.description ?? null,
    );
    const attached = await repo.setCourseEdition(
      db,
      edition.id,
      family.id,
      fields.locale,
    );
    const idBySourceId = new Map<string, string>();
    for (const concept of sourceConcepts) {
      const copy = await conceptsRepo.insertConcept(db, attached.id, {
        slug: concept.slug,
        name: fields.concept_names[concept.slug],
        kind: concept.kind,
        tier: concept.tier,
      });
      idBySourceId.set(concept.id, copy.id);
    }
    for (const edge of sourceEdges) {
      await conceptsRepo.upsertEdge(db, {
        from_concept: idBySourceId.get(edge.from_concept)!,
        to_concept: idBySourceId.get(edge.to_concept)!,
        strength: edge.strength,
        reason: edge.reason,
      });
    }
    return {
      family,
      edition: attached,
      concept_count: sourceConcepts.length,
      edge_count: sourceEdges.length,
    };
  });
}

export async function getCourseEditions(userId: string, subjectId: string) {
  const family = await repo.findCourseFamilyBySubject(
    getPool(),
    userId,
    subjectId,
  );
  if (!family) throw new NotFoundError("Course family not found");
  const editions = await repo.listCourseEditions(getPool(), family.id);
  return { family, editions };
}

export function listSubjects(userId: string) {
  return repo.listSubjects(userId);
}

export function listCatalogSubjects(official: boolean) {
  return repo.listCatalogSubjects(official);
}

export async function getSubject(userId: string, id: string) {
  const subject = await requireOwnedSubject(userId, id);
  const [concepts, edges] = await Promise.all([
    conceptsRepo.listConcepts(getPool(), id),
    conceptsRepo.listEdges(getPool(), id),
  ]);
  const slugs = slugById(concepts);
  return {
    ...subject,
    concepts: concepts.map(({ id: conceptId, slug, name, kind, tier }) => ({
      id: conceptId,
      slug,
      name,
      kind,
      tier,
    })),
    edges: edges.map((edge) => toPublicEdge(edge, slugs)),
  };
}

export async function updateSubject(
  userId: string,
  id: string,
  patch: { title?: unknown; description?: unknown; isPublic?: unknown },
) {
  const current = await requireOwnedSubject(userId, id);
  const next = {
    title:
      patch.title !== undefined
        ? parse(titleSchema, patch.title)
        : current.title,
    description:
      patch.description !== undefined
        ? parse(descriptionSchema, patch.description)
        : current.description,
    is_public:
      typeof patch.isPublic === "boolean" ? patch.isPublic : current.is_public,
  };
  const updated = await repo.writeSubject(id, next);
  if (!updated) throw new NotFoundError("Subject not found");
  return updated;
}

export async function deleteSubject(userId: string, id: string) {
  await requireOwnedSubject(userId, id);
  await repo.removeSubject(id);
}

type EvidenceRows = Awaited<ReturnType<typeof loadConceptEvidence>>;

function toEvidenceMap(
  evidenceRows: EvidenceRows,
  lessonRows: ConceptLessonRow[],
) {
  const evidence = new Map<string, ConceptEvidence>();
  for (const row of evidenceRows) {
    evidence.set(row.concept_id, {
      cardCount: row.card_count,
      masteredCardCount: row.mastered_card_count,
    });
  }
  for (const row of lessonRows) {
    const existing = evidence.get(row.concept_id) ?? {
      cardCount: 0,
      masteredCardCount: 0,
    };
    evidence.set(row.concept_id, {
      ...existing,
      lessonCount: row.lesson_count,
      unreadLessonCount: row.unread_lesson_count,
    });
  }
  return evidence;
}

/**
 * Where the learner stands in the subject: each concept's state, the route
 * (prerequisites first), and the frontier (what to study next). Computed from
 * live card_progress, so it can never disagree with real study state.
 */
export async function getSubjectProgress(userId: string, id: string) {
  const subject = await requireOwnedSubject(userId, id);
  const db = getPool();
  const [concepts, edges, evidenceRows, lessonRows] = await Promise.all([
    conceptsRepo.listConcepts(db, id),
    conceptsRepo.listEdges(db, id),
    loadConceptEvidence(db, userId, id, STABLE_REPS),
    loadConceptLessons(db, userId, id),
  ]);
  const evidence = toEvidenceMap(evidenceRows, lessonRows);
  const graphEdges = toGraphEdges(edges);
  const statuses = computeConceptStatuses(
    toGraphNodes(concepts),
    graphEdges,
    evidence,
  );
  const authoringOrder = concepts.map((concept) => concept.id);
  const route = topologicalOrder(authoringOrder, graphEdges) ?? authoringOrder;
  return buildProgressView(subject, concepts, evidence, statuses, route);
}

function describeConceptProgress(
  concept: conceptsRepo.ConceptRow,
  status: ReturnType<typeof computeConceptStatuses>[number],
  evidence: ConceptEvidence | undefined,
) {
  return {
    slug: concept.slug,
    name: concept.name,
    kind: concept.kind,
    tier: concept.tier,
    state: status.state,
    is_unassessed: status.isUnassessed,
    needs_reading: status.needsReading,
    card_count: evidence?.cardCount ?? 0,
    mastered_card_count: evidence?.masteredCardCount ?? 0,
    lesson_count: evidence?.lessonCount ?? 0,
    unread_lesson_count: evidence?.unreadLessonCount ?? 0,
  };
}

function buildProgressView(
  subject: repo.SubjectRow,
  concepts: conceptsRepo.ConceptRow[],
  evidenceById: Map<string, ConceptEvidence>,
  statuses: ReturnType<typeof computeConceptStatuses>,
  route: string[],
) {
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  const routed = route.map((conceptId) =>
    describeConceptProgress(
      conceptById.get(conceptId)!,
      statusById.get(conceptId)!,
      evidenceById.get(conceptId),
    ),
  );
  const countOf = (state: string) =>
    routed.filter((concept) => concept.state === state).length;
  return {
    subject_id: subject.id,
    version: subject.version,
    concepts: routed,
    frontier: studyFrontier(statuses, route).map(
      (conceptId) => conceptById.get(conceptId)!.slug,
    ),
    summary: {
      total: routed.length,
      mastered: countOf("mastered"),
      available: countOf("available"),
      locked: countOf("locked"),
    },
  };
}

export async function lintSubject(userId: string, id: string) {
  await requireOwnedSubject(userId, id);
  const [concepts, edges] = await Promise.all([
    conceptsRepo.listConcepts(getPool(), id),
    conceptsRepo.listEdges(getPool(), id),
  ]);
  const slugs = slugById(concepts);
  const issues = lintConceptGraph(toGraphNodes(concepts), toGraphEdges(edges));
  return issues.map((issue) => ({
    ...issue,
    conceptIds: issue.conceptIds.map(
      (conceptId) => slugs.get(conceptId) ?? conceptId,
    ),
  }));
}
