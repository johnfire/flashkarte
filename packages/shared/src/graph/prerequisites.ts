import type { ConceptEdge } from "./concept-graph-types";

function successorsByConcept(edges: ConceptEdge[]): Map<string, string[]> {
  const successors = new Map<string, string[]>();
  for (const edge of edges) {
    const dependents = successors.get(edge.from) ?? [];
    dependents.push(edge.to);
    successors.set(edge.from, dependents);
  }
  return successors;
}

/**
 * True when adding `from -> to` would make the graph cyclic, i.e. `from` is
 * already reachable from `to`. Both edge strengths count: `suggests` edges
 * order the route, so a cycle through them is just as unresolvable.
 */
export function wouldCreateCycle(
  edges: ConceptEdge[],
  from: string,
  to: string,
): boolean {
  if (from === to) return true;
  const successors = successorsByConcept(edges);
  const visited = new Set<string>();
  const pending = [to];
  while (pending.length > 0) {
    const current = pending.pop() as string;
    if (current === from) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...(successors.get(current) ?? []));
  }
  return false;
}

function countParents(
  conceptIds: string[],
  edges: ConceptEdge[],
): Map<string, number> {
  const parentCounts = new Map(conceptIds.map((id) => [id, 0]));
  for (const edge of edges) {
    parentCounts.set(edge.to, (parentCounts.get(edge.to) ?? 0) + 1);
  }
  return parentCounts;
}

function uniqueKnownEdges(
  conceptIds: string[],
  edges: ConceptEdge[],
): ConceptEdge[] {
  const known = new Set(conceptIds);
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = `${edge.from}->${edge.to}`;
    const isNew = !seen.has(key);
    seen.add(key);
    return isNew && known.has(edge.from) && known.has(edge.to);
  });
}

/**
 * Kahn's algorithm. Returns every concept that can be placed, prerequisites
 * first; concepts on or downstream of a cycle are missing from the result.
 * Deterministic: among concepts ready at the same time, the one that appears
 * first in `conceptIds` wins.
 */
function orderableConcepts(
  conceptIds: string[],
  edges: ConceptEdge[],
): string[] {
  const usable = uniqueKnownEdges(conceptIds, edges);
  const successors = successorsByConcept(usable);
  const waitingOn = countParents(conceptIds, usable);
  const inputPosition = new Map(conceptIds.map((id, index) => [id, index]));
  const ready = conceptIds.filter((id) => waitingOn.get(id) === 0);
  const order: string[] = [];

  while (ready.length > 0) {
    ready.sort(
      (a, b) => (inputPosition.get(a) ?? 0) - (inputPosition.get(b) ?? 0),
    );
    const next = ready.shift() as string;
    order.push(next);
    for (const dependent of successors.get(next) ?? []) {
      const remaining = (waitingOn.get(dependent) ?? 0) - 1;
      waitingOn.set(dependent, remaining);
      if (remaining === 0) ready.push(dependent);
    }
  }
  return order;
}

/**
 * Prerequisites before dependents, or null when the graph has a cycle. Edges
 * naming unknown concepts are ignored (the lint reports them).
 */
export function topologicalOrder(
  conceptIds: string[],
  edges: ConceptEdge[],
): string[] | null {
  const order = orderableConcepts(conceptIds, edges);
  return order.length === conceptIds.length ? order : null;
}

/** Concepts that cannot be ordered because they sit on, or downstream of, a cycle. */
export function unorderableConcepts(
  conceptIds: string[],
  edges: ConceptEdge[],
): string[] {
  const orderable = new Set(orderableConcepts(conceptIds, edges));
  return conceptIds.filter((id) => !orderable.has(id));
}

/**
 * Depth of each concept along `requires` edges only: 0 for a concept with no
 * prerequisites, else 1 + the deepest prerequisite. The longest chain sets the
 * minimum length of any route through the subject. Null on a cycle.
 */
export function prerequisiteLevels(
  conceptIds: string[],
  edges: ConceptEdge[],
): Map<string, number> | null {
  const requiresOnly = edges.filter((edge) => edge.strength === "requires");
  const order = topologicalOrder(conceptIds, requiresOnly);
  if (!order) return null;
  const parentsOf = new Map<string, string[]>();
  for (const edge of uniqueKnownEdges(conceptIds, requiresOnly)) {
    parentsOf.set(edge.to, [...(parentsOf.get(edge.to) ?? []), edge.from]);
  }
  const levels = new Map<string, number>();
  for (const id of order) {
    const parentLevels = (parentsOf.get(id) ?? []).map(
      (parent) => levels.get(parent) ?? 0,
    );
    levels.set(id, parentLevels.length ? Math.max(...parentLevels) + 1 : 0);
  }
  return levels;
}
