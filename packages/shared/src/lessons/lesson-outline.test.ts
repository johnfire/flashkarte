import { buildOutline, type OutlineLessonInput } from "./lesson-outline";

const lesson = (
  id: string,
  position: number,
  moduleId: string | null,
  title = id,
): OutlineLessonInput => ({
  id,
  slug: id,
  title,
  summary: `About ${id}`,
  position,
  moduleId,
  covers: [`${id} concept`],
});
const modules = [
  { id: "m2", title: "Attention", position: 2 },
  { id: "m1", title: "Input side", position: 1 },
];
const ids = (outline: ReturnType<typeof buildOutline>) =>
  outline.map((module) => ({
    title: module.title,
    lessons: module.lessons.map((l) => l.id),
  }));

describe("buildOutline", () => {
  it("lists modules in their own order, and lessons in authoring order when nothing is prerequisite", () => {
    const outline = buildOutline(
      modules,
      [lesson("b", 2, "m1"), lesson("a", 1, "m1"), lesson("c", 3, "m2")],
      [],
    );
    expect(ids(outline)).toEqual([
      { title: "Input side", lessons: ["a", "b"] },
      { title: "Attention", lessons: ["c"] },
    ]);
  });

  it("puts a prerequisite before its dependent even when it was authored later", () => {
    const outline = buildOutline(
      modules,
      [lesson("embeddings", 1, "m1"), lesson("tokens", 2, "m1")],
      [
        {
          from: "tokens",
          to: "embeddings",
          reason: "an embedding is what a token id becomes",
        },
      ],
    );
    expect(outline[0].lessons.map((l) => l.id)).toEqual([
      "tokens",
      "embeddings",
    ]);
  });

  it("says what unlocks each lesson, with the written reason, and keeps locked lessons visible", () => {
    const outline = buildOutline(
      modules,
      [
        lesson("tokens", 1, "m1", "Tokens"),
        lesson("attention", 2, "m2", "Attention"),
      ],
      [
        {
          from: "tokens",
          to: "attention",
          reason: "attention works on token vectors",
        },
      ],
    );
    const attention = outline[1].lessons[0];
    expect(attention.unlocksAfter).toEqual([
      {
        lessonId: "tokens",
        slug: "tokens",
        title: "Tokens",
        reason: "attention works on token vectors",
      },
    ]);
    expect(outline[0].lessons[0].unlocksAfter).toEqual([]);
  });

  it("orders lessons across modules by the whole graph, so a later module never precedes its prerequisite", () => {
    const outline = buildOutline(
      modules,
      [lesson("late", 1, "m1"), lesson("early", 2, "m2")],
      [{ from: "early", to: "late", reason: "r" }],
    );
    // Each module still lists only its own lessons, in graph order.
    expect(ids(outline)).toEqual([
      { title: "Input side", lessons: ["late"] },
      { title: "Attention", lessons: ["early"] },
    ]);
    expect(outline[0].lessons[0].unlocksAfter[0].lessonId).toBe("early");
  });

  it("puts lessons that belong to no module in a trailing group", () => {
    const outline = buildOutline(
      modules,
      [lesson("a", 1, "m1"), lesson("loose", 2, null)],
      [],
    );
    expect(outline.at(-1)).toMatchObject({ id: null, title: null });
    expect(outline.at(-1)!.lessons.map((l) => l.id)).toEqual(["loose"]);
  });

  it("keeps empty modules so a planned module is still visible", () => {
    const outline = buildOutline(modules, [lesson("a", 1, "m1")], []);
    expect(ids(outline)[1]).toEqual({ title: "Attention", lessons: [] });
  });

  it("matches the lesson graph: every dependent comes after all of its prerequisites", () => {
    const lessons = [1, 2, 3, 4, 5, 6].map((n) => lesson(`l${n}`, 7 - n, "m1"));
    const edges = [
      { from: "l1", to: "l2", reason: "r" },
      { from: "l1", to: "l3", reason: "r" },
      { from: "l2", to: "l4", reason: "r" },
      { from: "l3", to: "l4", reason: "r" },
      { from: "l4", to: "l5", reason: "r" },
    ];
    const order = buildOutline(modules, lessons, edges)[0].lessons.map(
      (l) => l.id,
    );
    for (const edge of edges) {
      expect(order.indexOf(edge.from)).toBeLessThan(order.indexOf(edge.to));
    }
    expect(order).toHaveLength(6);
  });
});
