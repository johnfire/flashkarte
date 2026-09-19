export type ConceptKind =
  "term" | "idea" | "skill" | "map" | "capstone" | "assumption";

export type EdgeStrength = "requires" | "suggests";

export interface ConceptNode {
  id: string;
  kind: ConceptKind;
}

/**
 * `from` is the prerequisite, `to` the concept that depends on it.
 * Only `requires` edges gate; `suggests` edges only influence ordering.
 */
export interface ConceptEdge {
  from: string;
  to: string;
  strength: EdgeStrength;
  reason?: string;
}
