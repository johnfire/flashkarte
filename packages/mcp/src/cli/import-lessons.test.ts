import * as apiModule from "../api";
import { EXIT, runImportLessons } from "./import-lessons";

jest.mock("../api", () => {
  const actual = jest.requireActual("../api");
  return { ...actual, get: jest.fn(), post: jest.fn() };
});
const mockApi = apiModule as jest.Mocked<typeof apiModule>;

const SUBJECT = "10000000-0000-4000-8000-000000000001";
const KEY = "fk_" + "a".repeat(64);
const GOOD_ENV = {
  FLASHKARTE_API_KEY: KEY,
  FLASHKARTE_API_URL: "https://flashkarte.example",
};

const lessonFile = (slug: string) =>
  JSON.stringify({
    module: "A module",
    lesson: { slug, title: slug },
    screens: [{ blocks: "Hi" }],
    questions: [],
    extra: "dropped",
  });
const result = (slug: string, issues: unknown[] = []) => ({
  lesson: { slug, stage: "testing" },
  module: { title: "A module" },
  screens: [{}],
  question_ids: [],
  issues,
});

function setup(
  files: Record<string, string>,
  env: Record<string, string | undefined> = GOOD_ENV,
) {
  const out: string[] = [];
  const err: string[] = [];
  const io = {
    readFile: (path: string) => {
      if (!(path in files)) throw new Error(`ENOENT: ${path}`);
      return files[path];
    },
    log: (line: string) => out.push(line),
    error: (line: string) => err.push(line),
    env,
  };
  return { io, out, err };
}

const deckKey = () =>
  mockApi.get.mockRejectedValue(new apiModule.ApiError(403, "forbidden"));

describe("import-lessons", () => {
  beforeEach(() => jest.resetAllMocks());

  it("explains a bad command line and posts nothing", async () => {
    for (const argv of [
      [],
      ["--subject", "nope", "a.json"],
      ["--subject", SUBJECT],
      ["--subject", SUBJECT, "--bogus", "a.json"],
    ]) {
      const { io, err } = setup({});
      expect(await runImportLessons(argv, io)).toBe(EXIT.failed);
      expect(err.join("\n")).toMatch(/usage:/);
    }
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it.each([
    [
      "no key",
      { FLASHKARTE_API_URL: "https://x.example" },
      /FLASHKARTE_API_KEY/,
    ],
    [
      "a malformed key",
      { ...GOOD_ENV, FLASHKARTE_API_KEY: "fk_short" },
      /fk_ API key/,
    ],
    [
      "a plain http URL",
      { ...GOOD_ENV, FLASHKARTE_API_URL: "http://flashkarte.example" },
      /https/,
    ],
    [
      "production",
      { ...GOOD_ENV, NODE_ENV: "production" },
      /NODE_ENV=production/,
    ],
  ])("refuses to start with %s", async (_name, env, message) => {
    const { io, err } = setup({ "a.json": lessonFile("a") }, env);
    expect(await runImportLessons(["--subject", SUBJECT, "a.json"], io)).toBe(
      EXIT.failed,
    );
    expect(err.join("\n")).toMatch(message);
    expect(mockApi.get).not.toHaveBeenCalled();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it("allows plain http only for localhost", async () => {
    deckKey();
    mockApi.post.mockResolvedValue(result("a"));
    const { io } = setup(
      { "a.json": lessonFile("a") },
      { ...GOOD_ENV, FLASHKARTE_API_URL: "http://localhost:3001" },
    );
    expect(await runImportLessons(["--subject", SUBJECT, "a.json"], io)).toBe(
      EXIT.ok,
    );
  });

  it("refuses a full-scope key, since the import would be recorded as the owner's own writing", async () => {
    mockApi.get.mockResolvedValue([]);
    const { io, err } = setup({ "a.json": lessonFile("a") });
    expect(await runImportLessons(["--subject", SUBJECT, "a.json"], io)).toBe(
      EXIT.failed,
    );
    expect(err.join("\n")).toMatch(/full-scope key/);
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it("lets a full-scope key through only when told to", async () => {
    mockApi.get.mockResolvedValue([]);
    mockApi.post.mockResolvedValue(result("a"));
    const { io } = setup({ "a.json": lessonFile("a") });
    expect(
      await runImportLessons(
        ["--subject", SUBJECT, "--allow-full-key", "a.json"],
        io,
      ),
    ).toBe(EXIT.ok);
  });

  it("imports files in the order given, sending only what the API takes", async () => {
    deckKey();
    mockApi.post.mockImplementation(async (path: string, body: unknown) =>
      result((body as { lesson: { slug: string } }).lesson.slug),
    );
    const { io, out } = setup({
      "first.json": lessonFile("first"),
      "second.json": lessonFile("second"),
    });
    expect(
      await runImportLessons(
        ["--subject", SUBJECT, "first.json", "second.json"],
        io,
      ),
    ).toBe(EXIT.ok);
    expect(mockApi.post.mock.calls.map(([path]) => path)).toEqual([
      `/api/subjects/${SUBJECT}/lessons/import`,
      `/api/subjects/${SUBJECT}/lessons/import`,
    ]);
    const body = mockApi.post.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      "lesson",
      "module",
      "questions",
      "screens",
    ]);
    expect(out[0]).toMatch(
      /first\.json: first \(testing\) in "A module", 1 screens, 0 questions, 0 issues/,
    );
    expect(out[1]).toMatch(/second\.json: second/);
  });

  it("reports issues the server saved, and exits 2", async () => {
    deckKey();
    mockApi.post.mockResolvedValue(
      result("a", [
        {
          level: "completeness",
          code: "CONCEPT_UNTESTED",
          message: "no question tests it",
        },
      ]),
    );
    const { io, out } = setup({ "a.json": lessonFile("a") });
    expect(await runImportLessons(["--subject", SUBJECT, "a.json"], io)).toBe(
      EXIT.importedWithIssues,
    );
    expect(out.join("\n")).toMatch(
      /completeness CONCEPT_UNTESTED: no question tests it/,
    );
  });

  it("stops at the first failure, so later lessons are not imported out of order", async () => {
    deckKey();
    mockApi.post
      .mockResolvedValueOnce(result("a"))
      .mockRejectedValueOnce(
        new apiModule.ApiError(400, "API POST returned 400: bad lesson"),
      );
    const { io, err } = setup({
      "a.json": lessonFile("a"),
      "b.json": lessonFile("b"),
      "c.json": lessonFile("c"),
    });
    expect(
      await runImportLessons(
        ["--subject", SUBJECT, "a.json", "b.json", "c.json"],
        io,
      ),
    ).toBe(EXIT.failed);
    expect(mockApi.post).toHaveBeenCalledTimes(2);
    expect(err.join("\n")).toMatch(/b\.json: .*bad lesson/);
  });

  it("checks every file is readable lesson JSON before importing anything from it", async () => {
    deckKey();
    for (const contents of [
      "not json",
      JSON.stringify({ lesson: {}, screens: [] }),
    ]) {
      const { io, err } = setup({ "a.json": contents });
      expect(await runImportLessons(["--subject", SUBJECT, "a.json"], io)).toBe(
        EXIT.failed,
      );
      expect(err.join("\n")).toMatch(/a\.json:/);
    }
    const { io, err } = setup({});
    expect(
      await runImportLessons(["--subject", SUBJECT, "missing.json"], io),
    ).toBe(EXIT.failed);
    expect(err.join("\n")).toMatch(/missing\.json: ENOENT/);
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it("says so when the server does not accept the key", async () => {
    mockApi.get.mockRejectedValue(new apiModule.ApiError(401, "nope"));
    const { io, err } = setup({ "a.json": lessonFile("a") });
    expect(await runImportLessons(["--subject", SUBJECT, "a.json"], io)).toBe(
      EXIT.failed,
    );
    expect(err.join("\n")).toMatch(/did not accept the API key/);
  });

  it("never prints the key", async () => {
    deckKey();
    mockApi.post.mockRejectedValue(new Error("boom"));
    const { io, out, err } = setup({ "a.json": lessonFile("a") });
    await runImportLessons(["--subject", SUBJECT, "a.json"], io);
    await runImportLessons(["--subject", SUBJECT], io);
    expect([...out, ...err].join("\n")).not.toContain(KEY);
  });
});
