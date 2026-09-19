export const CONCEPT_KINDS = [
  "term",
  "idea",
  "skill",
  "map",
  "capstone",
  "assumption",
] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];

export const CONCEPT_TIERS = ["core", "extension"] as const;
export type ConceptTier = (typeof CONCEPT_TIERS)[number];

export const EDGE_STRENGTHS = ["requires", "suggests"] as const;
export type EdgeStrength = (typeof EDGE_STRENGTHS)[number];

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
