import type { ConceptEdge, ConceptNode } from "./concept-graph-types";

/** How many of a concept's linked cards the learner has made stable. */
export interface ConceptEvidence {
  cardCount: number;
  masteredCardCount: number;
}

export type ConceptState = "mastered" | "available" | "locked";

export interface ConceptStatus {
  id: string;
  state: ConceptState;
  /**
   * No linked cards, so there is nothing to study or test. True for an
   * assumption too (it is never taught); authoring reports should skip those.
   */
  isUnassessed: boolean;
}

const NO_EVIDENCE: ConceptEvidence = { cardCount: 0, masteredCardCount: 0 };

function isMasteredByCards(evidence: ConceptEvidence): boolean {
  return (
    evidence.cardCount > 0 && evidence.masteredCardCount >= evidence.cardCount
  );
}

/**
 * Whether a concept lets its dependents unlock. Maps and assumptions never
 * gate. A concept with no cards is vacuously satisfied, so an unassessed
 * concept cannot become a silent dead end (Courses does the same for an
 * empty deck); it is flagged `isUnassessed` instead.
 */
function isSatisfied(node: ConceptNode, evidence: ConceptEvidence): boolean {
  if (node.kind === "map" || node.kind === "assumption") return true;
  return evidence.cardCount === 0 || isMasteredByCards(evidence);
}

function requiredParentsByConcept(edges: ConceptEdge[]): Map<string, string[]> {
  const parents = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.strength !== "requires") continue;
    parents.set(edge.to, [...(parents.get(edge.to) ?? []), edge.from]);
  }
  return parents;
}

export function computeConceptStatuses(
  nodes: ConceptNode[],
  edges: ConceptEdge[],
  evidenceByConcept: Map<string, ConceptEvidence>,
): ConceptStatus[] {
  const knownIds = new Set(nodes.map((node) => node.id));
  const satisfiedIds = new Set(
    nodes
      .filter((node) =>
        isSatisfied(node, evidenceByConcept.get(node.id) ?? NO_EVIDENCE),
      )
      .map((node) => node.id),
  );
  const requiredParents = requiredParentsByConcept(edges);
  // A parent that is not in the subject cannot lock anything; the lint reports it.
  const parentIsSatisfied = (id: string) =>
    satisfiedIds.has(id) || !knownIds.has(id);

  return nodes.map((node) => {
    const evidence = evidenceByConcept.get(node.id) ?? NO_EVIDENCE;
    const parentsAreSatisfied = (requiredParents.get(node.id) ?? []).every(
      parentIsSatisfied,
    );
    const state: ConceptState = isMasteredByCards(evidence)
      ? "mastered"
      : parentsAreSatisfied
        ? "available"
        : "locked";
    return {
      id: node.id,
      state,
      isUnassessed: evidence.cardCount === 0,
    };
  });
}

/**
 * What to study next: available concepts that have cards to study, in the
 * given route order (typically `topologicalOrder`).
 */
export function studyFrontier(
  statuses: ConceptStatus[],
  routeOrder: string[],
): string[] {
  const studyable = new Set(
    statuses
      .filter((status) => status.state === "available" && !status.isUnassessed)
      .map((status) => status.id),
  );
  return routeOrder.filter((id) => studyable.has(id));
}
