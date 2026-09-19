import type {
  ConceptEdge,
  ConceptKind,
  ConceptNode,
} from "./concept-graph-types";
import {
  computeConceptStatuses,
  studyFrontier,
  type ConceptEvidence,
} from "./concept-status";

const node = (id: string, kind: ConceptKind = "idea"): ConceptNode => ({
  id,
  kind,
});
const requires = (from: string, to: string): ConceptEdge => ({
  from,
  to,
  strength: "requires",
  reason: "test",
});
const evidence = (entries: Record<string, [number, number]>) =>
  new Map<string, ConceptEvidence>(
    Object.entries(entries).map(([id, [cardCount, masteredCardCount]]) => [
      id,
      { cardCount, masteredCardCount },
    ]),
  );
const stateOf = (
  statuses: ReturnType<typeof computeConceptStatuses>,
  id: string,
) => statuses.find((status) => status.id === id);

describe("computeConceptStatuses", () => {
  const nodes = [node("a"), node("b")];
  const edges = [requires("a", "b")];

  it("makes a root available and its dependent locked until the root is mastered", () => {
    const statuses = computeConceptStatuses(
      nodes,
      edges,
      evidence({ a: [2, 1], b: [2, 0] }),
    );
    expect(stateOf(statuses, "a")?.state).toBe("available");
    expect(stateOf(statuses, "b")?.state).toBe("locked");
  });

  it("marks a concept mastered only when every linked card is stable", () => {
    const statuses = computeConceptStatuses(
      nodes,
      edges,
      evidence({ a: [2, 2], b: [2, 0] }),
    );
    expect(stateOf(statuses, "a")?.state).toBe("mastered");
    expect(stateOf(statuses, "b")?.state).toBe("available");
  });

  it("treats a concept with no cards as unassessed and does not let it lock dependents", () => {
    const statuses = computeConceptStatuses(
      nodes,
      edges,
      evidence({ a: [0, 0], b: [1, 0] }),
    );
    expect(stateOf(statuses, "a")?.isUnassessed).toBe(true);
    expect(stateOf(statuses, "b")?.state).toBe("available");
  });

  it("never lets a map or an assumption gate, even when unmastered", () => {
    const statuses = computeConceptStatuses(
      [node("map", "map"), node("floor", "assumption"), node("real")],
      [requires("map", "real"), requires("floor", "real")],
      evidence({ map: [1, 0], real: [1, 0] }),
    );
    expect(stateOf(statuses, "real")?.state).toBe("available");
  });

  it("does not flag an assumption as unassessed", () => {
    const statuses = computeConceptStatuses(
      [node("floor", "assumption")],
      [],
      evidence({}),
    );
    expect(stateOf(statuses, "floor")?.isUnassessed).toBe(false);
  });

  it("lets a suggests edge order but never lock", () => {
    const statuses = computeConceptStatuses(
      nodes,
      [{ from: "a", to: "b", strength: "suggests" }],
      evidence({ a: [1, 0], b: [1, 0] }),
    );
    expect(stateOf(statuses, "b")?.state).toBe("available");
  });

  it("ignores a prerequisite that is not in the subject", () => {
    const statuses = computeConceptStatuses(
      [node("b")],
      [requires("ghost", "b")],
      evidence({ b: [1, 0] }),
    );
    expect(stateOf(statuses, "b")?.state).toBe("available");
  });

  it("requires all of several prerequisites (join concept)", () => {
    const statuses = computeConceptStatuses(
      [node("mask"), node("teacher"), node("join")],
      [requires("mask", "join"), requires("teacher", "join")],
      evidence({ mask: [1, 1], teacher: [1, 0], join: [1, 0] }),
    );
    expect(stateOf(statuses, "join")?.state).toBe("locked");
  });
});

describe("studyFrontier", () => {
  it("lists available, assessed concepts in route order", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d")];
    const edges = [requires("a", "b"), requires("a", "c")];
    const statuses = computeConceptStatuses(
      nodes,
      edges,
      evidence({ a: [1, 1], b: [1, 0], c: [1, 0], d: [0, 0] }),
    );
    expect(studyFrontier(statuses, ["a", "c", "b", "d"])).toEqual(["c", "b"]);
  });

  it("is empty when everything is mastered", () => {
    const statuses = computeConceptStatuses(
      [node("a")],
      [],
      evidence({ a: [2, 2] }),
    );
    expect(studyFrontier(statuses, ["a"])).toEqual([]);
  });
});
