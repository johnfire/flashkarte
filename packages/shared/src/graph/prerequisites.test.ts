import type { ConceptEdge } from "./concept-graph-types";
import {
  prerequisiteLevels,
  topologicalOrder,
  unorderableConcepts,
  wouldCreateCycle,
} from "./prerequisites";

const requires = (from: string, to: string): ConceptEdge => ({
  from,
  to,
  strength: "requires",
  reason: "test",
});
const suggests = (from: string, to: string): ConceptEdge => ({
  from,
  to,
  strength: "suggests",
});

describe("wouldCreateCycle", () => {
  const chain = [requires("a", "b"), requires("b", "c")];

  it("rejects a self edge", () => {
    expect(wouldCreateCycle([], "a", "a")).toBe(true);
  });

  it("rejects an edge that closes a direct loop", () => {
    expect(wouldCreateCycle(chain, "b", "a")).toBe(true);
  });

  it("rejects an edge that closes a transitive loop", () => {
    expect(wouldCreateCycle(chain, "c", "a")).toBe(true);
  });

  it("accepts an edge that keeps the graph acyclic", () => {
    expect(wouldCreateCycle(chain, "a", "c")).toBe(false);
    expect(wouldCreateCycle(chain, "d", "a")).toBe(false);
  });

  it("counts suggests edges, because they order the route too", () => {
    expect(wouldCreateCycle([suggests("a", "b")], "b", "a")).toBe(true);
  });
});

describe("topologicalOrder", () => {
  it("places every prerequisite before its dependents", () => {
    const order = topologicalOrder(
      ["c", "b", "a"],
      [requires("a", "b"), requires("b", "c")],
    );
    expect(order).toEqual(["a", "b", "c"]);
  });

  it("breaks ties by input order, so results are deterministic", () => {
    const edges = [requires("root", "x"), requires("root", "y")];
    expect(topologicalOrder(["root", "y", "x"], edges)).toEqual([
      "root",
      "y",
      "x",
    ]);
    expect(topologicalOrder(["root", "x", "y"], edges)).toEqual([
      "root",
      "x",
      "y",
    ]);
  });

  it("returns null when the graph has a cycle", () => {
    expect(
      topologicalOrder(["a", "b"], [requires("a", "b"), requires("b", "a")]),
    ).toBeNull();
  });

  it("ignores edges to unknown concepts and duplicate edges", () => {
    const edges = [requires("a", "b"), requires("a", "b"), requires("z", "b")];
    expect(topologicalOrder(["a", "b"], edges)).toEqual(["a", "b"]);
  });

  it("returns an empty order for an empty graph", () => {
    expect(topologicalOrder([], [])).toEqual([]);
  });
});

describe("unorderableConcepts", () => {
  it("is empty for an acyclic graph", () => {
    expect(unorderableConcepts(["a", "b"], [requires("a", "b")])).toEqual([]);
  });

  it("reports the cycle and everything downstream of it", () => {
    const edges = [
      requires("a", "b"),
      requires("b", "a"),
      requires("b", "downstream"),
    ];
    expect(
      unorderableConcepts(["a", "b", "downstream", "free"], edges),
    ).toEqual(["a", "b", "downstream"]);
  });
});

describe("prerequisiteLevels", () => {
  it("gives 0 to roots and 1 + the deepest parent to the rest", () => {
    const levels = prerequisiteLevels(
      ["a", "b", "c", "d"],
      [requires("a", "b"), requires("b", "c"), requires("a", "c")],
    );
    expect(levels?.get("a")).toBe(0);
    expect(levels?.get("b")).toBe(1);
    expect(levels?.get("c")).toBe(2);
    expect(levels?.get("d")).toBe(0);
  });

  it("ignores suggests edges", () => {
    const levels = prerequisiteLevels(["a", "b"], [suggests("a", "b")]);
    expect(levels?.get("b")).toBe(0);
  });

  it("returns null on a cycle", () => {
    expect(
      prerequisiteLevels(["a", "b"], [requires("a", "b"), requires("b", "a")]),
    ).toBeNull();
  });
});
