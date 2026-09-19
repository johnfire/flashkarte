import { closePool, getPool } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { ValidationError } from "../../utils/errors";
import { exportData } from "../account/account.service";
import { getAssetSvg, listAssets } from "../assets/assets.service";
import { importLesson } from "../lessons/lesson-import.service";
import * as lessons from "../lessons/lessons.service";
import * as questions from "../lessons/questions.service";
import * as screens from "../lessons/screens.service";
import * as concepts from "../subjects/concepts.service";
import * as subjects from "../subjects/subjects.service";

const OWNER = "10000000-0000-4000-8000-0000000000c1";
const SOFTMAX = "\\mathrm{softmax}(z)_i = \\frac{e^{z_i}}{\\sum_j e^{z_j}}";
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
    `INSERT INTO users (id, email, password_hash) VALUES ($1, 'maths@example.com', 'x')`,
    [OWNER],
  );
  subjectId = (await subjects.createSubject(OWNER, "Attention")).id;
  await concepts.addConcept(OWNER, subjectId, {
    slug: "softmax",
    name: "Softmax",
    kind: "idea",
  });
  await lessons.createLesson(OWNER, subjectId, {
    slug: "softmax",
    title: "Softmax",
    summary: "s",
    covers: ["softmax"],
  });
});

const para = (text: string) => [{ type: "paragraph", spans: [{ text }] }];
const formula = (latex: string, extra: object = {}) => ({
  type: "formula",
  latex,
  spoken: "spoken",
  ...extra,
});
const formulaAssets = async () =>
  (
    await getPool().query(
      `SELECT id, latex, display, width_em, height_em, depth_em, content FROM assets WHERE kind = 'formula' ORDER BY created_at`,
    )
  ).rows;
const blocksOf = async (number: string) =>
  (await lessons.getLesson(OWNER, subjectId, "softmax")).screens.find(
    (s) => s.number === number,
  )!.blocks as Record<string, unknown>[];

describe("a formula is drawn when its screen is saved", () => {
  it("stores one picture with its size, and puts the reference and size on the block", async () => {
    await screens.addScreen(
      OWNER,
      subjectId,
      "softmax",
      { blocks: [...para("Softmax is"), formula(SOFTMAX)] },
      "ai",
    );
    const [asset] = await formulaAssets();
    expect(asset).toMatchObject({ latex: SOFTMAX, display: true });
    expect(asset.width_em).toBeGreaterThan(5);
    expect(asset.content).toContain("currentColor");

    const [, block] = await blocksOf("1");
    expect(block).toMatchObject({
      type: "formula",
      latex: SOFTMAX,
      spoken: "spoken",
      assetId: asset.id,
      widthEm: asset.width_em,
      heightEm: asset.height_em,
      depthEm: asset.depth_em,
    });
    expect(await getAssetSvg(OWNER, subjectId, asset.id)).toBe(asset.content);
  });

  it("does not list the picture among the author's diagrams", async () => {
    await screens.addScreen(
      OWNER,
      subjectId,
      "softmax",
      { blocks: [formula("R = V/I")] },
      "ai",
    );
    expect(await listAssets(OWNER, subjectId)).toEqual([]);
  });

  it("reuses the picture when the same formula appears again", async () => {
    await screens.addScreen(
      OWNER,
      subjectId,
      "softmax",
      { blocks: [formula(SOFTMAX)] },
      "ai",
    );
    await screens.addScreen(
      OWNER,
      subjectId,
      "softmax",
      { blocks: [formula(SOFTMAX)] },
      "ai",
    );
    expect(await formulaAssets()).toHaveLength(1);
    const first = (await blocksOf("1"))[0];
    const second = (await blocksOf("2"))[0];
    expect(first.assetId).toBe(second.assetId);
  });

  it("ignores an asset id or size the author supplied, so a block cannot point at another picture", async () => {
    await concepts.addConcept(OWNER, subjectId, {
      slug: "other",
      name: "Other",
      kind: "idea",
    });
    const elsewhere = (await subjects.createSubject(OWNER, "Elsewhere")).id;
    await getPool().query(
      `INSERT INTO assets (subject_id, kind, content, author_kind, latex, display, width_em, height_em, depth_em)
       VALUES ($1, 'formula', '<svg/>', 'human', 'z', true, 1, 1, 1)`,
      [elsewhere],
    );
    const foreign = (
      await getPool().query(`SELECT id FROM assets WHERE subject_id = $1`, [
        elsewhere,
      ])
    ).rows[0].id;
    await screens.addScreen(
      OWNER,
      subjectId,
      "softmax",
      {
        blocks: [
          formula("a + b", {
            assetId: foreign,
            widthEm: 999,
            heightEm: 999,
            depthEm: 999,
          }),
        ],
      },
      "ai",
    );
    const [block] = await blocksOf("1");
    expect(block.assetId).not.toBe(foreign);
    expect(block.widthEm).not.toBe(999);
    const own = (await formulaAssets()).find((a) => a.latex === "a + b")!;
    expect(block.assetId).toBe(own.id);
  });

  it("refuses a formula MathJax cannot read, naming it, and saves nothing", async () => {
    await expect(
      screens.addScreen(
        OWNER,
        subjectId,
        "softmax",
        { blocks: [...para("x"), formula("\\frac{a")] },
        "ai",
      ),
    ).rejects.toThrow(/could not be read/);
    await expect(
      screens.addScreen(
        OWNER,
        subjectId,
        "softmax",
        { blocks: [formula("\\href{javascript:alert(1)}{x}")] },
        "ai",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(
      (await lessons.getLesson(OWNER, subjectId, "softmax")).screens,
    ).toHaveLength(0);
    expect(await formulaAssets()).toHaveLength(0);
  });

  it("draws a new picture when a formula is edited, keeping the old one for history", async () => {
    await screens.addScreen(
      OWNER,
      subjectId,
      "softmax",
      { blocks: [formula("a + b")] },
      "ai",
    );
    await screens.updateScreen(OWNER, subjectId, "1", {
      blocks: [formula("a - b")],
    });
    const [block] = await blocksOf("1");
    const drawn = await formulaAssets();
    expect(drawn.map((a) => a.latex).sort()).toEqual(["a + b", "a - b"]);
    expect(block.assetId).toBe(drawn.find((a) => a.latex === "a - b")!.id);
  });

  it("draws formulas in a question's prompt, options, reasons and variants", async () => {
    await screens.addScreen(
      OWNER,
      subjectId,
      "softmax",
      { blocks: para("teach") },
      "ai",
    );
    const made = await questions.addQuestion(OWNER, subjectId, "softmax", {
      prompt: [...para("What is"), formula("e^{z_i}")],
      options: [
        {
          correct: true,
          blocks: [formula("\\frac{1}{2}")],
          reason: [formula("x^2")],
        },
        { correct: false, blocks: para("no"), reason: para("no") },
      ],
      teaches: ["1"],
      covers: ["softmax"],
      variants: [
        {
          prompt: [formula("y_j")],
          options: [
            { correct: true, blocks: para("a"), reason: para("b") },
            { correct: false, blocks: para("c"), reason: para("d") },
          ],
        },
      ],
    });
    expect(made.id).toBeTruthy();
    expect((await formulaAssets()).map((a) => a.latex).sort()).toEqual([
      "\\frac{1}{2}",
      "e^{z_i}",
      "x^2",
      "y_j",
    ]);
    const stored = (
      await getPool().query(
        `SELECT prompt, options FROM lesson_questions WHERE parent_id IS NULL`,
      )
    ).rows[0];
    expect(stored.prompt[1]).toHaveProperty("assetId");
    expect(stored.options[0].blocks[0]).toHaveProperty("assetId");
    expect(stored.options[0].reason[0]).toHaveProperty("assetId");
  });

  it("draws formulas when a whole lesson is imported", async () => {
    await importLesson(
      OWNER,
      subjectId,
      {
        lesson: {
          slug: "imported",
          title: "Imported",
          summary: "s",
          covers: ["softmax"],
        },
        screens: [{ ref: "a", blocks: [formula("\\sum_i x_i")] }],
        questions: [],
      },
      "ai",
    );
    expect((await formulaAssets()).map((a) => a.latex)).toEqual([
      "\\sum_i x_i",
    ]);
  });
});

describe("a formula picture belongs to the subject", () => {
  it("is not served from another subject, is exported with its source, and goes with the subject", async () => {
    await screens.addScreen(
      OWNER,
      subjectId,
      "softmax",
      { blocks: [formula("a + b")] },
      "ai",
    );
    const [asset] = await formulaAssets();
    const elsewhere = (await subjects.createSubject(OWNER, "Elsewhere")).id;
    await expect(getAssetSvg(OWNER, elsewhere, asset.id)).rejects.toThrow(
      /not found/,
    );

    const exported = (await exportData(OWNER)).lessonContent.assets;
    expect(exported).toEqual([
      expect.objectContaining({
        id: asset.id,
        kind: "formula",
        latex: "a + b",
      }),
    ]);

    await subjects.deleteSubject(OWNER, subjectId);
    expect(await formulaAssets()).toHaveLength(0);
  });
});
