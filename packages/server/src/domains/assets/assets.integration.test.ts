import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { exportData } from "../account/account.service";
import * as lessons from "../lessons/lessons.service";
import * as questions from "../lessons/questions.service";
import * as screens from "../lessons/screens.service";
import * as concepts from "../subjects/concepts.service";
import * as subjects from "../subjects/subjects.service";
import {
  MAX_ASSETS_PER_SUBJECT,
  createAsset,
  deleteAsset,
  getAssetSvg,
  listAssets,
} from "./assets.service";

const OWNER = "10000000-0000-4000-8000-0000000000a1";
const OTHER = "10000000-0000-4000-8000-0000000000a2";
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><title>Box</title><rect width="100" height="50" fill="#eef"/></svg>`;

let subjectId: string;

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error("Integration tests require POSTGRES_DB ending in _test");
  }
  await runMigrations();
});
afterAll(closePool);
beforeEach(async () => {
  const pool = getPool();
  await pool.query("TRUNCATE TABLE users CASCADE");
  await pool.query(
    `INSERT INTO users (id, email, password_hash) VALUES ($1, 'assets-a@example.com', 'x'), ($2, 'assets-b@example.com', 'x')`,
    [OWNER, OTHER],
  );
  subjectId = (await subjects.createSubject(OWNER, "Circuits")).id;
  await concepts.addConcept(OWNER, subjectId, {
    slug: "rc",
    name: "RC",
    kind: "idea",
  });
});

const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const image = (src: string) => [
  { type: "image", src, alt: "An RC circuit", display: "inline" },
];

async function lessonWithImage(src: string) {
  await lessons.createLesson(OWNER, subjectId, {
    slug: "rc-basics",
    title: "RC",
    summary: "s",
    covers: ["rc"],
  });
  await screens.addScreen(
    OWNER,
    subjectId,
    "rc-basics",
    { blocks: image(src) },
    "human",
  );
}

describe("storing a diagram", () => {
  it("cleans it, stores it, and hands back the src for an image block", async () => {
    const made = await createAsset(
      OWNER,
      subjectId,
      {
        svg: SVG.replace("</svg>", "<script>alert(1)</script></svg>"),
        description: "A box",
      },
      "ai",
    );
    expect(made.src).toBe(`asset:${made.id}`);
    expect(made).toMatchObject({
      kind: "diagram",
      author_kind: "ai",
      description: "A box",
    });
    expect(made.removed).toEqual(["<script>"]);
    const svg = await getAssetSvg(OWNER, subjectId, made.id);
    expect(svg).toContain("<rect");
    expect(svg).not.toContain("script");
    expect(made.size).toBe(svg.length);
  });

  it("refuses an SVG it cannot clean, and stores nothing", async () => {
    await expect(
      createAsset(OWNER, subjectId, { svg: "<svg>" }, "human"),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      createAsset(OWNER, subjectId, {}, "human"),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await listAssets(OWNER, subjectId)).toEqual([]);
  });

  it("lists what a subject holds, oldest first, without the SVG text", async () => {
    const one = await createAsset(OWNER, subjectId, { svg: SVG }, "human");
    const two = await createAsset(
      OWNER,
      subjectId,
      { svg: SVG, description: "second" },
      "ai",
    );
    const listed = await listAssets(OWNER, subjectId);
    expect(listed.map((a) => a.id)).toEqual([one.id, two.id]);
    expect(JSON.stringify(listed)).not.toContain("<rect");
  });

  it("stops at the per-subject limit", async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO assets (subject_id, kind, content, author_kind)
       SELECT $1, 'diagram', $2, 'ai' FROM generate_series(1, $3)`,
      [subjectId, SVG, MAX_ASSETS_PER_SUBJECT],
    );
    await expect(
      createAsset(OWNER, subjectId, { svg: SVG }, "ai"),
    ).rejects.toThrow(/at most 300 images/);
  });

  it("keeps two simultaneous creates within the limit", async () => {
    await getPool().query(
      `INSERT INTO assets (subject_id, kind, content, author_kind)
       SELECT $1, 'diagram', $2, 'ai' FROM generate_series(1, $3)`,
      [subjectId, SVG, MAX_ASSETS_PER_SUBJECT - 1],
    );
    const results = await Promise.allSettled([
      createAsset(OWNER, subjectId, { svg: SVG }, "ai"),
      createAsset(OWNER, subjectId, { svg: SVG }, "ai"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await listAssets(OWNER, subjectId)).length).toBe(
      MAX_ASSETS_PER_SUBJECT,
    );
  });
});

describe("who can see an image", () => {
  it("only its subject's owner, and only through that subject", async () => {
    const made = await createAsset(OWNER, subjectId, { svg: SVG }, "human");
    await expect(getAssetSvg(OTHER, subjectId, made.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      createAsset(OTHER, subjectId, { svg: SVG }, "human"),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(listAssets(OTHER, subjectId)).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const elsewhere = (await subjects.createSubject(OWNER, "Elsewhere")).id;
    await expect(getAssetSvg(OWNER, elsewhere, made.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      getAssetSvg(OWNER, subjectId, "not-an-id"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("images and lessons", () => {
  it("reports an image whose diagram is missing, and clears once the diagram exists", async () => {
    const made = await createAsset(OWNER, subjectId, { svg: SVG }, "ai");
    await lessons.createLesson(OWNER, subjectId, {
      slug: "rc-basics",
      title: "RC",
      summary: "s",
      covers: ["rc"],
    });
    const missing = "0a1b2c3d-0000-4000-8000-000000000009";
    const added = await screens.addScreen(
      OWNER,
      subjectId,
      "rc-basics",
      { blocks: image(`asset:${missing}`) },
      "human",
    );
    expect(added.issues.map((i) => i.code)).toContain("IMAGE_ASSET_MISSING");
    await screens.updateScreen(OWNER, subjectId, added.screen.number, {
      blocks: image(made.src),
    });
    const lint = await lessons.lintLessonForOwner(
      OWNER,
      subjectId,
      "rc-basics",
    );
    expect(lint.map((i) => i.code)).not.toContain("IMAGE_ASSET_MISSING");
  });

  it("will not delete a diagram a screen uses, in its text or its history, but will an unused one", async () => {
    const used = await createAsset(OWNER, subjectId, { svg: SVG }, "ai");
    const unused = await createAsset(OWNER, subjectId, { svg: SVG }, "ai");
    await lessonWithImage(used.src);
    await expect(deleteAsset(OWNER, subjectId, used.id)).rejects.toThrow(
      /still uses this image/,
    );
    await deleteAsset(OWNER, subjectId, unused.id);
    await expect(
      getAssetSvg(OWNER, subjectId, unused.id),
    ).rejects.toBeInstanceOf(NotFoundError);

    // Once the screen shows something else, the old image is still in its history: it stays.
    const number = (await lessons.getLesson(OWNER, subjectId, "rc-basics"))
      .screens[0].number;
    await screens.updateScreen(OWNER, subjectId, number, {
      blocks: para("no image now"),
    });
    await expect(deleteAsset(OWNER, subjectId, used.id)).rejects.toThrow(
      /still uses this image/,
    );
  });

  it("will not delete a diagram a question's option uses", async () => {
    const made = await createAsset(OWNER, subjectId, { svg: SVG }, "ai");
    await lessons.createLesson(OWNER, subjectId, {
      slug: "rc-basics",
      title: "RC",
      summary: "s",
      covers: ["rc"],
    });
    await screens.addScreen(
      OWNER,
      subjectId,
      "rc-basics",
      { blocks: para("teach") },
      "human",
    );
    await questions.addQuestion(OWNER, subjectId, "rc-basics", {
      prompt: para("Which circuit?"),
      options: [
        { correct: true, blocks: image(made.src), reason: para("Yes") },
        { correct: false, blocks: para("Neither"), reason: para("No") },
      ],
      teaches: ["1"],
      covers: ["rc"],
    });
    await expect(deleteAsset(OWNER, subjectId, made.id)).rejects.toThrow(
      /still uses this image/,
    );
  });
});

describe("the diagram belongs to the owner's data", () => {
  it("is exported with the subject, and erased with the subject and with the account", async () => {
    const made = await createAsset(
      OWNER,
      subjectId,
      { svg: SVG, description: "A box" },
      "ai",
    );
    const exported = (await exportData(OWNER)).lessonContent.assets;
    expect(exported).toEqual([
      expect.objectContaining({
        id: made.id,
        subjectId,
        kind: "diagram",
        description: "A box",
        authorKind: "ai",
      }),
    ]);
    expect(exported[0].svg).toContain("<rect");

    await subjects.deleteSubject(OWNER, subjectId);
    expect((await getPool().query("SELECT 1 FROM assets")).rowCount).toBe(0);

    const again = (await subjects.createSubject(OWNER, "Again")).id;
    await createAsset(OWNER, again, { svg: SVG }, "human");
    await getPool().query("DELETE FROM users WHERE id = $1", [OWNER]);
    expect((await getPool().query("SELECT 1 FROM assets")).rowCount).toBe(0);
  });
});
