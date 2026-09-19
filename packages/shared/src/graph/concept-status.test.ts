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

  it("reports an assumption as having no cards, like any concept without items", () => {
    const statuses = computeConceptStatuses(
      [node("floor", "assumption")],
      [],
      evidence({}),
    );
    expect(stateOf(statuses, "floor")?.isUnassessed).toBe(true);
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

  it("never offers an assumption, a map without cards, or a card-less concept", () => {
    const statuses = computeConceptStatuses(
      [
        node("floor", "assumption"),
        node("overview", "map"),
        node("empty"),
        node("real"),
      ],
      [requires("floor", "real")],
      evidence({ real: [1, 0] }),
    );
    expect(
      studyFrontier(statuses, ["floor", "overview", "empty", "real"]),
    ).toEqual(["real"]);
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

describe("lessons (reading cards)", () => {
  const evidenceWith = (
    entries: Record<string, [number, number, number, number]>,
  ) =>
    new Map<string, ConceptEvidence>(
      Object.entries(entries).map(
        ([
          id,
          [cardCount, masteredCardCount, lessonCount, unreadLessonCount],
        ]) => [
          id,
          { cardCount, masteredCardCount, lessonCount, unreadLessonCount },
        ],
      ),
    );

  it("offers a reading-only concept until it is read, then marks it mastered", () => {
    const nodes = [node("map", "map")];
    const before = computeConceptStatuses(
      nodes,
      [],
      evidenceWith({ map: [0, 0, 2, 2] }),
    );
    expect(stateOf(before, "map")?.needsReading).toBe(true);
    expect(studyFrontier(before, ["map"])).toEqual(["map"]);

    const partly = computeConceptStatuses(
      nodes,
      [],
      evidenceWith({ map: [0, 0, 2, 1] }),
    );
    expect(stateOf(partly, "map")?.state).toBe("available");
    expect(studyFrontier(partly, ["map"])).toEqual(["map"]);

    const after = computeConceptStatuses(
      nodes,
      [],
      evidenceWith({ map: [0, 0, 2, 0] }),
    );
    expect(stateOf(after, "map")?.state).toBe("mastered");
    expect(studyFrontier(after, ["map"])).toEqual([]);
  });

  it("never lets an unread lesson lock a dependent: reading is exposure, not a gate", () => {
    const statuses = computeConceptStatuses(
      [node("a"), node("b")],
      [requires("a", "b")],
      evidenceWith({ a: [0, 0, 1, 1], b: [1, 0, 0, 0] }),
    );
    expect(stateOf(statuses, "b")?.state).toBe("available");
  });

  it("does not count reading toward mastery of a concept that has cards", () => {
    const statuses = computeConceptStatuses(
      [node("a")],
      [],
      evidenceWith({ a: [2, 1, 1, 0] }),
    );
    expect(stateOf(statuses, "a")?.state).toBe("available");
  });

  it("still offers a lesson on a concept whose cards are already mastered", () => {
    const statuses = computeConceptStatuses(
      [node("a")],
      [],
      evidenceWith({ a: [1, 1, 1, 1] }),
    );
    expect(stateOf(statuses, "a")?.state).toBe("mastered");
    expect(studyFrontier(statuses, ["a"])).toEqual(["a"]);
  });

  it("does not offer the lessons of a locked concept", () => {
    const statuses = computeConceptStatuses(
      [node("a"), node("b")],
      [requires("a", "b")],
      evidenceWith({ a: [1, 0, 0, 0], b: [1, 0, 1, 1] }),
    );
    expect(stateOf(statuses, "b")?.state).toBe("locked");
    expect(stateOf(statuses, "b")?.needsReading).toBe(false);
    expect(studyFrontier(statuses, ["a", "b"])).toEqual(["a"]);
  });

  it("treats missing lesson counts as none, so existing callers are unchanged", () => {
    const statuses = computeConceptStatuses(
      [node("a")],
      [],
      evidence({ a: [1, 0] }),
    );
    expect(stateOf(statuses, "a")?.needsReading).toBe(false);
  });
});
