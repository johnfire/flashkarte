import { STABLE_REPS } from "@flashkarte/shared";
import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import * as concepts from "./concepts.service";
import * as subjects from "./subjects.service";
import * as accountRepo from "../account/account.repository";
import { importSubject } from "./subjects-import.service";

const OWNER_ID = "10000000-0000-4000-8000-0000000000a1";
const OUTSIDER_ID = "10000000-0000-4000-8000-0000000000a2";
const DECK_ID = "20000000-0000-4000-8000-0000000000a1";
const OUTSIDER_DECK_ID = "20000000-0000-4000-8000-0000000000a2";
const CARD_1 = "30000000-0000-4000-8000-0000000000a1";
const CARD_2 = "30000000-0000-4000-8000-0000000000a2";
const CARD_3 = "30000000-0000-4000-8000-0000000000a3";
const READING_CARD = "30000000-0000-4000-8000-0000000000a4";
const BRANCH_CARD = "30000000-0000-4000-8000-0000000000a5";
const OUTSIDER_CARD = "30000000-0000-4000-8000-0000000000a6";

function assertSafeIntegrationDatabase(): void {
  const databaseName = process.env.POSTGRES_DB ?? "";
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      "Subject integration tests require POSTGRES_DB ending in _test",
    );
  }
}

async function resetFixtures(): Promise<void> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES
       ($1, 'subjects-owner@example.com', 'x'),
       ($2, 'subjects-outsider@example.com', 'x')`,
    [OWNER_ID, OUTSIDER_ID],
  );
  await pool.query(
    `INSERT INTO decks (id, user_id, title) VALUES
       ($1, $2, 'Owner deck'), ($3, $4, 'Outsider deck')`,
    [DECK_ID, OWNER_ID, OUTSIDER_DECK_ID, OUTSIDER_ID],
  );
  const basic = '\'{"front":"Q","back":"A"}\'::jsonb';
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, type, content, position) VALUES
       ($1, $7, $8, 'basic', ${basic}, 0),
       ($2, $7, $8, 'basic', ${basic}, 1),
       ($3, $7, $8, 'basic', ${basic}, 2),
       ($4, $7, $8, 'read', '{"front":"Lesson","back":"Read this"}'::jsonb, 3),
       ($5, $7, $8, 'branch',
         '{"label":"a","prompt":"Start","options":[{"text":"Go","goto":"end"}]}'::jsonb, 4),
       ($6, $9, $10, 'basic', ${basic}, 0)`,
    [
      CARD_1,
      CARD_2,
      CARD_3,
      READING_CARD,
      BRANCH_CARD,
      OUTSIDER_CARD,
      OWNER_ID,
      DECK_ID,
      OUTSIDER_ID,
      OUTSIDER_DECK_ID,
    ],
  );
}

async function markRepetitions(cardId: string, repetitions: number) {
  await getPool().query(
    `INSERT INTO card_progress (user_id, card_id, repetitions)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, card_id) DO UPDATE SET repetitions = EXCLUDED.repetitions`,
    [OWNER_ID, cardId, repetitions],
  );
}

const edge = (from: string, to: string, reason = "because") => ({
  from,
  to,
  strength: "requires",
  reason,
});

/** A subject with concepts a, b, c and no edges. */
async function seedSubject(slugs = ["a", "b", "c"]) {
  const subject = await subjects.createSubject(OWNER_ID, "Test subject");
  for (const slug of slugs) {
    await concepts.addConcept(OWNER_ID, subject.id, {
      slug,
      name: `Concept ${slug}`,
      kind: "idea",
    });
  }
  return subject;
}

const progressOf = async (subjectId: string) =>
  subjects.getSubjectProgress(OWNER_ID, subjectId);
const stateOf = (
  progress: Awaited<ReturnType<typeof progressOf>>,
  slug: string,
) => progress.concepts.find((concept) => concept.slug === slug)?.state;

beforeAll(async () => {
  assertSafeIntegrationDatabase();
  await runMigrations();
});
beforeEach(resetFixtures);
afterAll(async () => {
  await closePool();
});

describe("database constraints (real Postgres)", () => {
  it("rejects a requires edge with no reason, a self edge, and a bad kind", async () => {
    const subject = await seedSubject(["a", "b"]);
    const pool = getPool();
    const { rows } = await pool.query<{ id: string }>(
      "SELECT id FROM concepts WHERE subject_id = $1 ORDER BY position",
      [subject.id],
    );
    const [a, b] = rows.map((row) => row.id);
    await expect(
      pool.query(
        `INSERT INTO concept_edges (from_concept, to_concept, strength, reason)
         VALUES ($1, $2, 'requires', '   ')`,
        [a, b],
      ),
    ).rejects.toThrow(/concept_edges_requires_reason/);
    await expect(
      pool.query(
        `INSERT INTO concept_edges (from_concept, to_concept, strength, reason)
         VALUES ($1, $1, 'suggests', NULL)`,
        [a],
      ),
    ).rejects.toThrow(/concept_edges_no_self_edge/);
    await expect(
      pool.query(
        `INSERT INTO concepts (subject_id, slug, name, kind) VALUES ($1, 'x', 'x', 'nonsense')`,
        [subject.id],
      ),
    ).rejects.toThrow(/kind/);
  });
});

describe("subjects and concepts", () => {
  it("lists a subject with its concept count", async () => {
    await seedSubject(["a", "b"]);
    const listed = await subjects.listSubjects(OWNER_ID);
    expect(listed).toHaveLength(1);
    expect(listed[0].concept_count).toBe(2);
  });

  it("publishes an owner's course to the community catalogue but not an official course", async () => {
    const subject = await seedSubject(["a"]);

    const unpublished = await subjects.listSubjects(OWNER_ID);
    expect(unpublished[0]).toMatchObject({
      user_id: OWNER_ID,
      is_public: false,
      is_official: false,
    });
    expect(await subjects.listCatalogSubjects(false)).toEqual([]);

    await subjects.updateSubject(OWNER_ID, subject.id, { isPublic: true });
    expect(await subjects.listCatalogSubjects(false)).toHaveLength(1);

    await getPool().query(
      "UPDATE subjects SET is_official = true WHERE id = $1",
      [subject.id],
    );
    await expect(
      subjects.updateSubject(OWNER_ID, subject.id, { isPublic: false }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("keeps concepts in authoring order and bumps the version on every edit", async () => {
    const subject = await seedSubject(["zeta", "alpha"]);
    const loaded = await subjects.getSubject(OWNER_ID, subject.id);
    expect(loaded.concepts.map((concept) => concept.slug)).toEqual([
      "zeta",
      "alpha",
    ]);
    expect(loaded.version).toBe(3);
  });

  it("rejects a duplicate slug and an invalid slug", async () => {
    const subject = await seedSubject(["a"]);
    await expect(
      concepts.addConcept(OWNER_ID, subject.id, {
        slug: "a",
        name: "again",
        kind: "idea",
      }),
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      concepts.addConcept(OWNER_ID, subject.id, {
        slug: "Not Valid",
        name: "x",
        kind: "idea",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("hides a subject from anyone but its owner", async () => {
    const subject = await seedSubject(["a"]);
    await expect(
      subjects.getSubject(OUTSIDER_ID, subject.id),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      concepts.addConcept(OUTSIDER_ID, subject.id, {
        slug: "x",
        name: "x",
        kind: "idea",
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      subjects.deleteSubject(OUTSIDER_ID, subject.id),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deleting a subject cascades to its graph but leaves cards alone", async () => {
    const subject = await seedSubject(["a", "b"]);
    await concepts.setEdge(OWNER_ID, subject.id, edge("a", "b"));
    await concepts.linkCards(OWNER_ID, subject.id, "a", [CARD_1]);
    await subjects.deleteSubject(OWNER_ID, subject.id);
    const pool = getPool();
    const count = async (table: string) =>
      Number((await pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count);
    expect(await count("concepts")).toBe(0);
    expect(await count("concept_edges")).toBe(0);
    expect(await count("card_concepts")).toBe(0);
    expect(await count("cards")).toBe(6);
  });

  it("deleting a concept removes its edges and card links", async () => {
    const subject = await seedSubject(["a", "b"]);
    await concepts.setEdge(OWNER_ID, subject.id, edge("a", "b"));
    await concepts.linkCards(OWNER_ID, subject.id, "a", [CARD_1]);
    await concepts.deleteConcept(OWNER_ID, subject.id, "a");
    const loaded = await subjects.getSubject(OWNER_ID, subject.id);
    expect(loaded.edges).toEqual([]);
    const links = await getPool().query("SELECT 1 FROM card_concepts");
    expect(links.rowCount).toBe(0);
  });
});

describe("edges", () => {
  it("adds a prerequisite and updates it in place", async () => {
    const subject = await seedSubject();
    await concepts.setEdge(OWNER_ID, subject.id, edge("a", "b", "first"));
    await concepts.setEdge(OWNER_ID, subject.id, {
      from: "a",
      to: "b",
      strength: "suggests",
    });
    const loaded = await subjects.getSubject(OWNER_ID, subject.id);
    expect(loaded.edges).toEqual([
      { from: "a", to: "b", strength: "suggests", reason: null },
    ]);
  });

  it("requires a reason for a requires edge", async () => {
    const subject = await seedSubject();
    await expect(
      concepts.setEdge(OWNER_ID, subject.id, {
        from: "a",
        to: "b",
        strength: "requires",
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects edges to concepts that do not exist", async () => {
    const subject = await seedSubject();
    await expect(
      concepts.setEdge(OWNER_ID, subject.id, edge("a", "ghost")),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a direct, a transitive and a suggests-only cycle", async () => {
    const subject = await seedSubject();
    await concepts.setEdge(OWNER_ID, subject.id, edge("a", "b"));
    await concepts.setEdge(OWNER_ID, subject.id, edge("b", "c"));
    await expect(
      concepts.setEdge(OWNER_ID, subject.id, edge("b", "a")),
    ).rejects.toThrow(/cycle/);
    await expect(
      concepts.setEdge(OWNER_ID, subject.id, edge("c", "a")),
    ).rejects.toThrow(/cycle/);
    await expect(
      concepts.setEdge(OWNER_ID, subject.id, {
        from: "c",
        to: "a",
        strength: "suggests",
      }),
    ).rejects.toThrow(/cycle/);
  });

  it("stops concurrent edits from together closing a cycle", async () => {
    const subject = await seedSubject();
    const attempts = await Promise.allSettled([
      concepts.setEdge(OWNER_ID, subject.id, edge("a", "b")),
      concepts.setEdge(OWNER_ID, subject.id, edge("b", "c")),
      concepts.setEdge(OWNER_ID, subject.id, edge("c", "a")),
    ]);
    expect(attempts.filter((a) => a.status === "rejected")).toHaveLength(1);
    expect(await subjects.lintSubject(OWNER_ID, subject.id)).toEqual([]);
  });

  it("removes an edge, and says so when it is not there", async () => {
    const subject = await seedSubject();
    await concepts.setEdge(OWNER_ID, subject.id, edge("a", "b"));
    await concepts.removeEdge(OWNER_ID, subject.id, "a", "b");
    await expect(
      concepts.removeEdge(OWNER_ID, subject.id, "a", "b"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("linking cards", () => {
  it("replaces the linked set and de-duplicates", async () => {
    const subject = await seedSubject(["a"]);
    await concepts.linkCards(OWNER_ID, subject.id, "a", [CARD_1, CARD_2]);
    const result = await concepts.linkCards(OWNER_ID, subject.id, "a", [
      CARD_3,
      CARD_3,
    ]);
    expect(result.card_ids).toEqual([CARD_3]);
    const rows = await getPool().query("SELECT card_id FROM card_concepts");
    expect(rows.rows).toEqual([{ card_id: CARD_3 }]);
  });

  it("refuses a card the caller does not own, and changes nothing", async () => {
    const subject = await seedSubject(["a"]);
    await concepts.linkCards(OWNER_ID, subject.id, "a", [CARD_1]);
    await expect(
      concepts.linkCards(OWNER_ID, subject.id, "a", [CARD_2, OUTSIDER_CARD]),
    ).rejects.toBeInstanceOf(NotFoundError);
    const rows = await getPool().query("SELECT card_id FROM card_concepts");
    expect(rows.rows).toEqual([{ card_id: CARD_1 }]);
  });
});

describe("progress and the frontier", () => {
  async function chainWithCards() {
    const subject = await seedSubject(["a", "b"]);
    await concepts.setEdge(OWNER_ID, subject.id, edge("a", "b"));
    await concepts.linkCards(OWNER_ID, subject.id, "a", [CARD_1, CARD_2]);
    await concepts.linkCards(OWNER_ID, subject.id, "b", [CARD_3]);
    return subject;
  }

  it("starts with the root available and its dependent locked", async () => {
    const progress = await progressOf((await chainWithCards()).id);
    expect(stateOf(progress, "a")).toBe("available");
    expect(stateOf(progress, "b")).toBe("locked");
    expect(progress.frontier).toEqual(["a"]);
  });

  it("needs every linked card stable before a concept is mastered", async () => {
    const subject = await chainWithCards();
    await markRepetitions(CARD_1, STABLE_REPS);
    await markRepetitions(CARD_2, STABLE_REPS - 1);
    expect(stateOf(await progressOf(subject.id), "a")).toBe("available");

    await markRepetitions(CARD_2, STABLE_REPS);
    const progress = await progressOf(subject.id);
    expect(stateOf(progress, "a")).toBe("mastered");
    expect(stateOf(progress, "b")).toBe("available");
    expect(progress.frontier).toEqual(["b"]);
    expect(progress.summary).toEqual({
      total: 2,
      mastered: 1,
      available: 1,
      locked: 0,
    });
  });

  it("ignores reading and branch cards as evidence", async () => {
    const subject = await chainWithCards();
    await concepts.linkCards(OWNER_ID, subject.id, "a", [
      CARD_1,
      READING_CARD,
      BRANCH_CARD,
    ]);
    await markRepetitions(CARD_1, STABLE_REPS);
    const progress = await progressOf(subject.id);
    expect(stateOf(progress, "a")).toBe("mastered");
    expect(progress.concepts.find((c) => c.slug === "a")?.card_count).toBe(1);
  });

  it("flags a concept with no cards but does not let it block", async () => {
    const subject = await seedSubject(["a", "b"]);
    await concepts.setEdge(OWNER_ID, subject.id, edge("a", "b"));
    await concepts.linkCards(OWNER_ID, subject.id, "b", [CARD_3]);
    const progress = await progressOf(subject.id);
    expect(progress.concepts.find((c) => c.slug === "a")?.is_unassessed).toBe(
      true,
    );
    expect(stateOf(progress, "b")).toBe("available");
  });

  it("orders the route with prerequisites first", async () => {
    const subject = await seedSubject(["late", "early"]);
    await concepts.setEdge(OWNER_ID, subject.id, edge("early", "late"));
    const progress = await progressOf(subject.id);
    expect(progress.concepts.map((c) => c.slug)).toEqual(["early", "late"]);
  });
});

describe("import", () => {
  const chain = () => ({
    title: "Imported",
    description: "from json",
    concepts: [
      { slug: "one", name: "One", kind: "term", cards: [CARD_1] },
      { slug: "two", name: "Two", kind: "idea", cards: [CARD_2, CARD_3] },
    ],
    edges: [edge("one", "two", "two builds on one")],
  });
  const countOf = async (table: string) =>
    Number(
      (await getPool().query(`SELECT count(*) FROM ${table}`)).rows[0].count,
    );

  it("creates the subject, concepts, edges and card links together", async () => {
    const result = await importSubject(OWNER_ID, chain());
    expect(result.concept_count).toBe(2);
    expect(result.edge_count).toBe(1);
    const loaded = await subjects.getSubject(OWNER_ID, result.subject.id);
    expect(loaded.concepts.map((c) => c.slug)).toEqual(["one", "two"]);
    expect(await countOf("card_concepts")).toBe(3);
  });

  it("leaves nothing behind when the graph has a cycle", async () => {
    const bad = chain();
    bad.edges.push(edge("two", "one", "circular"));
    await expect(importSubject(OWNER_ID, bad)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await countOf("subjects")).toBe(0);
    expect(await countOf("concepts")).toBe(0);
  });

  it("leaves nothing behind when a card is not the caller's", async () => {
    const bad = chain();
    bad.concepts[0].cards = [OUTSIDER_CARD];
    await expect(importSubject(OWNER_ID, bad)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await countOf("subjects")).toBe(0);
  });

  it("rejects duplicate slugs and an edge to an unknown concept", async () => {
    const duplicate = chain();
    duplicate.concepts[1].slug = "one";
    await expect(importSubject(OWNER_ID, duplicate)).rejects.toThrow(
      /Duplicate/,
    );
    const unknown = chain();
    unknown.edges.push(edge("one", "ghost"));
    await expect(importSubject(OWNER_ID, unknown)).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await countOf("subjects")).toBe(0);
  });

  it("returns fan-in as an advisory without blocking the import", async () => {
    const parents = ["p1", "p2", "p3", "p4", "p5"];
    const result = await importSubject(OWNER_ID, {
      title: "Wide",
      concepts: [
        ...parents.map((slug) => ({ slug, name: slug, kind: "term" })),
        { slug: "child", name: "Child", kind: "idea" },
      ],
      edges: parents.map((slug) => edge(slug, "child")),
    });
    expect(result.advisories.map((issue) => issue.code)).toEqual([
      "TOO_MANY_REQUIRES",
    ]);
    expect(await countOf("concepts")).toBe(6);
  });
});

describe("account data export (real Postgres)", () => {
  it("exports subjects, concepts with their card ids, and edges by slug", async () => {
    const { subject } = await importSubject(OWNER_ID, {
      title: "Exported",
      concepts: [
        { slug: "one", name: "One", kind: "term", cards: [CARD_1, CARD_2] },
        { slug: "two", name: "Two", kind: "idea" },
      ],
      edges: [edge("one", "two", "two builds on one")],
    });

    const exportedSubjects = await accountRepo.findSubjects(OWNER_ID);
    const exportedConcepts = await accountRepo.findConcepts(OWNER_ID);
    const exportedEdges = await accountRepo.findConceptEdges(OWNER_ID);

    expect(exportedSubjects.map((row) => row.id)).toEqual([subject.id]);
    expect(exportedConcepts.map((row) => row.slug)).toEqual(["one", "two"]);
    expect([...exportedConcepts[0].card_ids].sort()).toEqual([CARD_1, CARD_2]);
    expect(exportedConcepts[1].card_ids).toEqual([]);
    expect(exportedEdges).toEqual([
      {
        subject_id: subject.id,
        from_slug: "one",
        to_slug: "two",
        strength: "requires",
        reason: "two builds on one",
      },
    ]);
  });

  it("never exports another user's subjects", async () => {
    await seedSubject(["a"]);
    expect(await accountRepo.findSubjects(OUTSIDER_ID)).toEqual([]);
    expect(await accountRepo.findConcepts(OUTSIDER_ID)).toEqual([]);
    expect(await accountRepo.findConceptEdges(OUTSIDER_ID)).toEqual([]);
  });

  it("deleting the account removes every subject table row", async () => {
    await seedSubject(["a", "b"]);
    await getPool().query("DELETE FROM users WHERE id = $1", [OWNER_ID]);
    for (const table of [
      "subjects",
      "concepts",
      "concept_edges",
      "card_concepts",
    ]) {
      const result = await getPool().query(`SELECT count(*) FROM ${table}`);
      expect(Number(result.rows[0].count)).toBe(0);
    }
  });
});

describe("malformed ids", () => {
  it("surfaces a bad subject id as a Postgres 22P02, which the error handler maps to 404", async () => {
    await expect(
      subjects.getSubject(OWNER_ID, "not-a-uuid"),
    ).rejects.toMatchObject({
      code: "22P02",
    });
  });
});
