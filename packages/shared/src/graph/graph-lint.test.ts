import type {
  ConceptEdge,
  ConceptKind,
  ConceptNode,
} from "./concept-graph-types";
import { lintConceptGraph, MAX_REQUIRES_PARENTS } from "./graph-lint";

const node = (id: string, kind: ConceptKind = "idea"): ConceptNode => ({
  id,
  kind,
});
const requires = (
  from: string,
  to: string,
  reason = "because",
): ConceptEdge => ({
  from,
  to,
  strength: "requires",
  reason,
});

const codes = (nodes: ConceptNode[], edges: ConceptEdge[]) =>
  lintConceptGraph(nodes, edges).map((issue) => issue.code);

describe("lintConceptGraph", () => {
  it("passes a clean graph", () => {
    expect(
      lintConceptGraph([node("a"), node("b")], [requires("a", "b")]),
    ).toEqual([]);
  });

  it("flags an edge to a concept that does not exist", () => {
    expect(codes([node("a")], [requires("a", "ghost")])).toEqual([
      "UNKNOWN_CONCEPT",
    ]);
  });

  it("flags a self edge", () => {
    expect(codes([node("a")], [requires("a", "a")])).toContain("SELF_EDGE");
  });

  it("flags a cycle and names the concepts stuck in it", () => {
    const issues = lintConceptGraph(
      [node("a"), node("b")],
      [requires("a", "b"), requires("b", "a")],
    );
    const cycle = issues.find((issue) => issue.code === "CYCLE");
    expect(cycle?.conceptIds).toEqual(["a", "b"]);
  });

  it("requires a reason on a requires edge, but not on a suggests edge", () => {
    expect(codes([node("a"), node("b")], [requires("a", "b", "  ")])).toEqual([
      "REQUIRES_WITHOUT_REASON",
    ]);
    expect(
      lintConceptGraph(
        [node("a"), node("b")],
        [{ from: "a", to: "b", strength: "suggests" }],
      ),
    ).toEqual([]);
  });

  describe("fan-in", () => {
    const parents = (count: number) =>
      Array.from({ length: count }, (_, index) => `p${index}`);
    const graphWithParents = (count: number, kind: ConceptKind) => ({
      nodes: [...parents(count).map((id) => node(id)), node("child", kind)],
      edges: parents(count).map((id) => requires(id, "child")),
    });

    it("allows exactly the maximum number of required parents", () => {
      const { nodes, edges } = graphWithParents(MAX_REQUIRES_PARENTS, "idea");
      expect(lintConceptGraph(nodes, edges)).toEqual([]);
    });

    it("flags one more than the maximum", () => {
      const { nodes, edges } = graphWithParents(
        MAX_REQUIRES_PARENTS + 1,
        "idea",
      );
      expect(codes(nodes, edges)).toEqual(["TOO_MANY_REQUIRES"]);
    });

    it("exempts capstones, which combine many concepts by design", () => {
      const { nodes, edges } = graphWithParents(
        MAX_REQUIRES_PARENTS + 3,
        "capstone",
      );
      expect(lintConceptGraph(nodes, edges)).toEqual([]);
    });
  });
});
