import fs from "fs";
import path from "path";
import { STABLE_REPS } from "@flashkarte/shared";
import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import * as subjects from "./subjects.service";
import { importSubject } from "./subjects-import.service";

/**
 * The real Transformers graph (docs/plans/2026-09-19-transformers-concept-dag.md)
 * imported into real Postgres against a placeholder 86-card deck, then a learner
 * is walked through the whole route. Proves the graph is accepted, traversable
 * (no deadlock) and that the frontier never offers a concept early.
 */
interface FixtureConcept {
  slug: string;
  name: string;
  kind: string;
  tier: string;
  cards: number[];
}
interface Fixture {
  title: string;
  description: string;
  concepts: FixtureConcept[];
  edges: Array<{ from: string; to: string; strength: string; reason?: string }>;
}

const fixture: Fixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "fixtures", "transformers-subject.json"),
    "utf8",
  ),
);

const USER_ID = "10000000-0000-4000-8000-0000000000c1";
const DECK_ID = "20000000-0000-4000-8000-0000000000c1";
const DECK_SIZE = 86;

const cardIdFor = (cardNumber: number) =>
  `30000000-0000-4000-8000-${String(cardNumber).padStart(12, "0")}`;

async function seedDeck(): Promise<void> {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES ($1, 'transformers@example.com', 'x')`,
    [USER_ID],
  );
  await pool.query(
    `INSERT INTO decks (id, user_id, title) VALUES ($1, $2, 'Transformers')`,
    [DECK_ID, USER_ID],
  );
  await pool.query(
    `INSERT INTO cards (id, user_id, deck_id, type, content, position)
     SELECT ('30000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
            $1, $2, 'basic', '{"front":"Q","back":"A"}'::jsonb, n - 1
     FROM generate_series(1, $3) AS n`,
    [USER_ID, DECK_ID, DECK_SIZE],
  );
}

const withCardIds = (concept: FixtureConcept) => ({
  ...concept,
  cards: concept.cards.map(cardIdFor),
});

async function importTransformers() {
  return importSubject(USER_ID, {
    title: fixture.title,
    description: fixture.description,
    concepts: fixture.concepts.map(withCardIds),
    edges: fixture.edges,
  });
}

async function makeCardsStable(cardNumbers: number[]) {
  for (const cardNumber of cardNumbers) {
    await getPool().query(
      `INSERT INTO card_progress (user_id, card_id, repetitions) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, card_id) DO UPDATE SET repetitions = EXCLUDED.repetitions`,
      [USER_ID, cardIdFor(cardNumber), STABLE_REPS],
    );
  }
}

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error("Integration tests require POSTGRES_DB ending in _test");
  }
  await runMigrations();
});
beforeEach(seedDeck);
afterAll(async () => {
  await closePool();
});

describe("the Transformers subject", () => {
  it("imports cleanly: no defects, no advisories, every concept and edge stored", async () => {
    const result = await importTransformers();
    expect(result.concept_count).toBe(82);
    expect(result.edge_count).toBe(156);
    expect(result.advisories).toEqual([]);
    expect(await subjects.lintSubject(USER_ID, result.subject.id)).toEqual([]);
  });

  it("orders the route so every prerequisite comes first", async () => {
    const { subject } = await importTransformers();
    const progress = await subjects.getSubjectProgress(USER_ID, subject.id);
    const position = new Map(progress.concepts.map((c, i) => [c.slug, i]));
    for (const edge of fixture.edges) {
      expect(position.get(edge.from)!).toBeLessThan(position.get(edge.to)!);
    }
  });

  it("starts with only root concepts on the frontier", async () => {
    const { subject } = await importTransformers();
    const { frontier } = await subjects.getSubjectProgress(USER_ID, subject.id);
    expect(frontier).toEqual(
      expect.arrayContaining(["pipeline-map", "token", "softmax"]),
    );
    expect(frontier).not.toContain("attention-gist");
    expect(frontier).not.toContain("kv-cache");
  });

  it("can be learned end to end: the frontier never deadlocks or jumps ahead", async () => {
    const { subject } = await importTransformers();
    const cardsOf = new Map(fixture.concepts.map((c) => [c.slug, c.cards]));
    const kindOf = new Map(fixture.concepts.map((c) => [c.slug, c.kind]));
    const gatingParents = (slug: string) =>
      fixture.edges
        .filter((e) => e.to === slug && e.strength === "requires")
        .map((e) => e.from)
        .filter((parent) => {
          const gates = !["assumption", "map"].includes(kindOf.get(parent)!);
          return gates && (cardsOf.get(parent) ?? []).length > 0;
        });

    for (let round = 0; round < fixture.concepts.length; round++) {
      const progress = await subjects.getSubjectProgress(USER_ID, subject.id);
      if (progress.frontier.length === 0) break;
      // Read mastery from the server, not from what this test has done: cards 11
      // and 31 belong to several concepts, so mastering one masters its siblings.
      const masteredNow = new Set(
        progress.concepts
          .filter((c) => c.state === "mastered")
          .map((c) => c.slug),
      );
      for (const slug of progress.frontier) {
        for (const parent of gatingParents(slug)) {
          expect(masteredNow.has(parent)).toBe(true);
        }
        await makeCardsStable(cardsOf.get(slug) ?? []);
      }
    }

    const final = await subjects.getSubjectProgress(USER_ID, subject.id);
    expect(final.frontier).toEqual([]);
    expect(final.summary.locked).toBe(0);
    const unfinished = final.concepts.filter(
      (c) => c.card_count > 0 && c.state !== "mastered",
    );
    expect(unfinished.map((c) => c.slug)).toEqual([]);
  });

  it("flags the concepts that still have no items, so authoring can see them", async () => {
    const { subject } = await importTransformers();
    const { concepts } = await subjects.getSubjectProgress(USER_ID, subject.id);
    const unassessed = concepts
      .filter((c) => c.is_unassessed && c.kind !== "assumption")
      .map((c) => c.slug);
    expect(unassessed).toEqual(["pipeline-order-capstone"]);
  });
});
