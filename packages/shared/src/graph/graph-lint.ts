import type { ConceptEdge, ConceptNode } from "./concept-graph-types";
import { unorderableConcepts } from "./prerequisites";

/** More `requires` parents than this usually means the concept is really two. */
export const MAX_REQUIRES_PARENTS = 4;

export type GraphIssueCode =
  | "UNKNOWN_CONCEPT"
  | "SELF_EDGE"
  | "CYCLE"
  | "REQUIRES_WITHOUT_REASON"
  | "TOO_MANY_REQUIRES";

export interface GraphIssue {
  code: GraphIssueCode;
  message: string;
  conceptIds: string[];
}

function edgeIssues(knownIds: Set<string>, edges: ConceptEdge[]): GraphIssue[] {
  const issues: GraphIssue[] = [];
  for (const edge of edges) {
    const label = `${edge.from} -> ${edge.to}`;
    if (edge.from === edge.to) {
      issues.push({
        code: "SELF_EDGE",
        message: `A concept cannot depend on itself (${label})`,
        conceptIds: [edge.from],
      });
    }
    if (!knownIds.has(edge.from) || !knownIds.has(edge.to)) {
      issues.push({
        code: "UNKNOWN_CONCEPT",
        message: `Edge ${label} names a concept that is not in the subject`,
        conceptIds: [edge.from, edge.to],
      });
    }
    if (edge.strength === "requires" && !edge.reason?.trim()) {
      issues.push({
        code: "REQUIRES_WITHOUT_REASON",
        message: `Edge ${label} is a requirement but gives no reason`,
        conceptIds: [edge.from, edge.to],
      });
    }
  }
  return issues;
}

function fanInIssues(nodes: ConceptNode[], edges: ConceptEdge[]): GraphIssue[] {
  const requiredParents = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.strength !== "requires") continue;
    const parents = requiredParents.get(edge.to) ?? new Set<string>();
    parents.add(edge.from);
    requiredParents.set(edge.to, parents);
  }
  return nodes
    .filter((node) => node.kind !== "capstone")
    .filter(
      (node) =>
        (requiredParents.get(node.id)?.size ?? 0) > MAX_REQUIRES_PARENTS,
    )
    .map((node) => ({
      code: "TOO_MANY_REQUIRES" as const,
      message: `${node.id} has more than ${MAX_REQUIRES_PARENTS} required prerequisites; it may be two concepts`,
      conceptIds: [node.id],
    }));
}

/**
 * Structural checks an authoring tool should run before publishing a graph.
 * They prove the graph is self-consistent, not that its edges are correct:
 * whether a prerequisite is real still needs a reader who knows the subject.
 */
export function lintConceptGraph(
  nodes: ConceptNode[],
  edges: ConceptEdge[],
): GraphIssue[] {
  const conceptIds = nodes.map((node) => node.id);
  const issues = [
    ...edgeIssues(new Set(conceptIds), edges),
    ...fanInIssues(nodes, edges),
  ];
  const stuck = unorderableConcepts(conceptIds, edges);
  if (stuck.length > 0) {
    issues.push({
      code: "CYCLE",
      message: `These concepts cannot be ordered because of a cycle: ${stuck.join(", ")}`,
      conceptIds: stuck,
    });
  }
  return issues;
}
