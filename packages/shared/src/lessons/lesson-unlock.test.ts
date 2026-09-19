import {
  canOpen,
  computeLessonAccess,
  type LessonProgressStatus,
} from "./lesson-unlock";

const status = (entries: Record<string, LessonProgressStatus>) =>
  new Map(Object.entries(entries));
const access = (
  ids: string[],
  edges: [string, string][],
  entries: Record<string, LessonProgressStatus> = {},
) =>
  Object.fromEntries(
    [
      ...computeLessonAccess(
        ids,
        edges.map(([from, to]) => ({ from, to })),
        status(entries),
      ),
    ].map(([id, info]) => [id, info.access]),
  );

describe("computeLessonAccess", () => {
  it("opens the lessons with no prerequisites and locks the rest", () => {
    expect(
      access(
        ["a", "b", "c"],
        [
          ["a", "b"],
          ["b", "c"],
        ],
      ),
    ).toEqual({ a: "available", b: "locked", c: "locked" });
  });

  it("unlocks a lesson only when every prerequisite is passed", () => {
    const edges: [string, string][] = [
      ["a", "c"],
      ["b", "c"],
    ];
    expect(access(["a", "b", "c"], edges, { a: "passed" }).c).toBe("locked");
    expect(
      access(["a", "b", "c"], edges, { a: "passed", b: "in_progress" }).c,
    ).toBe("locked");
    expect(access(["a", "b", "c"], edges, { a: "passed", b: "passed" }).c).toBe(
      "available",
    );
  });

  it("says what a locked lesson is waiting for", () => {
    const info = computeLessonAccess(
      ["a", "b", "c"],
      [
        { from: "a", to: "c" },
        { from: "b", to: "c" },
      ],
      status({ a: "passed" }),
    );
    expect(info.get("c")).toEqual({ access: "locked", missing: ["b"] });
    expect(info.get("a")).toEqual({ access: "passed", missing: [] });
  });

  it("never takes progress away when a prerequisite is added later", () => {
    const edges: [string, string][] = [["a", "b"]];
    expect(access(["a", "b"], edges, { b: "passed" }).b).toBe("passed");
    expect(access(["a", "b"], edges, { b: "in_progress" }).b).toBe(
      "in_progress",
    );
  });

  it("handles a diamond and ignores edges to lessons that do not exist", () => {
    const edges: [string, string][] = [
      ["a", "b"],
      ["a", "c"],
      ["b", "d"],
      ["c", "d"],
      ["ghost", "a"],
    ];
    expect(access(["a", "b", "c", "d"], edges)).toEqual({
      a: "available",
      b: "locked",
      c: "locked",
      d: "locked",
    });
    expect(
      access(["a", "b", "c", "d"], edges, {
        a: "passed",
        b: "passed",
        c: "passed",
      }).d,
    ).toBe("available");
  });

  it("lets a learner open an available lesson or resume one in progress, but not a locked or passed one", () => {
    const info = computeLessonAccess(
      ["a", "b", "c", "d"],
      [{ from: "a", to: "b" }],
      status({ c: "in_progress" }),
    );
    expect([...info.values()].map(canOpen)).toEqual([true, false, true, true]);
    const passed = computeLessonAccess(["a"], [], status({ a: "passed" }));
    expect(canOpen(passed.get("a")!)).toBe(false);
  });
});
