import type { ConceptEdge, ConceptNode } from "@flashkarte/shared";
import type { ConceptRow, EdgeRow } from "./concepts.repository";

export function toGraphNodes(concepts: ConceptRow[]): ConceptNode[] {
  return concepts.map((concept) => ({ id: concept.id, kind: concept.kind }));
}

export function toGraphEdges(edges: EdgeRow[]): ConceptEdge[] {
  return edges.map((edge) => ({
    from: edge.from_concept,
    to: edge.to_concept,
    strength: edge.strength,
    reason: edge.reason ?? undefined,
  }));
}

export function slugById(concepts: ConceptRow[]): Map<string, string> {
  return new Map(concepts.map((concept) => [concept.id, concept.slug]));
}

/** The API speaks slugs, never concept UUIDs, at its edges. */
export function toPublicEdge(edge: EdgeRow, slugs: Map<string, string>) {
  return {
    from: slugs.get(edge.from_concept) ?? edge.from_concept,
    to: slugs.get(edge.to_concept) ?? edge.to_concept,
    strength: edge.strength,
    reason: edge.reason,
  };
}
