import { z } from "zod";
import * as apiModule from "../api";
import { registerLessonTools } from "./lessons";

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
}));
const mockApi = apiModule as jest.Mocked<typeof apiModule>;

type Handler = (args: Record<string, unknown>) => Promise<unknown>;
function setup() {
  const handlers: Record<string, Handler> = {};
  const descriptions: Record<string, string> = {};
  const shapes: Record<string, z.ZodRawShape> = {};
  registerLessonTools({
    tool: (...args: unknown[]) => {
      handlers[args[0] as string] = args[args.length - 1] as Handler;
      descriptions[args[0] as string] = args[1] as string;
      shapes[args[0] as string] = args[2] as z.ZodRawShape;
    },
  } as never);
  return { handlers, descriptions, shapes };
}

const S = "10000000-0000-4000-8000-000000000001";
const para = [{ type: "paragraph", spans: [{ text: "x" }] }];

describe("lesson MCP tools", () => {
  beforeEach(() => jest.clearAllMocks());

  it("registers the authoring tools", () => {
    expect(Object.keys(setup().handlers).sort()).toEqual([
      "add_question",
      "add_question_variant",
      "add_screen",
      "answer_help_request",
      "create_image",
      "create_module",
      "delete_image",
      "delete_screen",
      "finish_lesson",
      "get_lesson",
      "get_outline",
      "get_question_insights",
      "import_lesson",
      "lint_lesson",
      "list_help_requests",
      "list_images",
      "list_screen_comments",
      "resolve_screen_comment",
      "retire_screen",
      "set_lesson_prerequisite",
      "update_question",
      "update_screen",
    ]);
  });

  it("get_question_insights reads the lesson's insights", async () => {
    mockApi.get.mockResolvedValue({ questions: [] });
    await setup().handlers.get_question_insights({
      subject_id: S,
      lesson: "tokens",
    });
    expect(mockApi.get).toHaveBeenCalledWith(
      `/api/subjects/${S}/lessons/tokens/insights`,
    );
  });

  it("lists a lesson's open comments, and resolves one", async () => {
    mockApi.get.mockResolvedValue({ comments: [] });
    mockApi.post.mockResolvedValue({});
    const { handlers } = setup();
    await handlers.list_screen_comments({ subject_id: S, lesson: "tokens" });
    expect(mockApi.get).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/lessons/tokens/comments`,
    );
    await handlers.list_screen_comments({
      subject_id: S,
      lesson: "tokens",
      include_resolved: true,
    });
    expect(mockApi.get).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/lessons/tokens/comments?include_resolved=true`,
    );
    await handlers.resolve_screen_comment({ subject_id: S, comment_id: "c1" });
    expect(mockApi.post).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/comments/c1/resolve`,
      {},
    );
  });

  it("stores, lists and deletes images under the subject", async () => {
    mockApi.post.mockResolvedValue({});
    mockApi.get.mockResolvedValue([]);
    mockApi.del.mockResolvedValue(undefined);
    const { handlers } = setup();
    await handlers.create_image({
      subject_id: S,
      svg: "<svg/>",
      description: "A box",
    });
    expect(mockApi.post).toHaveBeenLastCalledWith(`/api/subjects/${S}/assets`, {
      svg: "<svg/>",
      description: "A box",
    });
    await handlers.list_images({ subject_id: S });
    expect(mockApi.get).toHaveBeenLastCalledWith(`/api/subjects/${S}/assets`);
    await handlers.delete_image({ subject_id: S, image_id: "a1" });
    expect(mockApi.del).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/assets/a1`,
    );
  });

  it("reads the help queue, and answers a request with sourced screens in one call", async () => {
    mockApi.get.mockResolvedValue({ requests: [] });
    mockApi.post.mockResolvedValue({});
    const { handlers } = setup();
    await handlers.list_help_requests({ subject_id: S });
    expect(mockApi.get).toHaveBeenLastCalledWith(`/api/subjects/${S}/help`);
    await handlers.list_help_requests({ subject_id: S, lesson: "tokens" });
    expect(mockApi.get).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/help?lesson=tokens`,
    );
    const screens = [
      {
        blocks: para,
        sources: [{ title: "The deck", url: "https://example.com" }],
      },
    ];
    await handlers.answer_help_request({
      subject_id: S,
      request_id: "r1",
      screens,
    });
    expect(mockApi.post).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/help/r1/answer`,
      { screens },
    );
  });

  it("import_lesson posts the whole lesson under the subject", async () => {
    mockApi.post.mockResolvedValue({});
    const body = {
      module: "Input side",
      lesson: { slug: "tokens", title: "Tokens", covers: ["token"] },
      screens: [{ ref: "a", blocks: para }],
      questions: [],
    };
    await setup().handlers.import_lesson({ subject_id: S, ...body });
    expect(mockApi.post).toHaveBeenCalledWith(
      `/api/subjects/${S}/lessons/import`,
      body,
    );
  });

  it("add_screen sends a place only when one is given", async () => {
    mockApi.post.mockResolvedValue({});
    const { handlers } = setup();
    await handlers.add_screen({
      subject_id: S,
      lesson: "tokens",
      blocks: para,
    });
    expect(mockApi.post).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/lessons/tokens/screens`,
      {
        blocks: para,
        place: undefined,
        sources: undefined,
      },
    );
    await handlers.add_screen({
      subject_id: S,
      lesson: "tokens",
      blocks: para,
      after: "213",
    });
    expect(mockApi.post).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/lessons/tokens/screens`,
      {
        blocks: para,
        place: { after: "213", before: undefined },
        sources: undefined,
      },
    );
  });

  it("addresses a screen by its decimal number, and a variant under its question", async () => {
    mockApi.patch.mockResolvedValue({});
    mockApi.post.mockResolvedValue({});
    const { handlers } = setup();
    await handlers.update_screen({
      subject_id: S,
      number: "213.010",
      blocks: para,
    });
    expect(mockApi.patch).toHaveBeenCalledWith(
      `/api/subjects/${S}/screens/213.010`,
      { blocks: para, number: undefined },
    );
    await handlers.retire_screen({ subject_id: S, number: "213.010" });
    expect(mockApi.post).toHaveBeenCalledWith(
      `/api/subjects/${S}/screens/213.010/retire`,
    );
    const qid = "20000000-0000-4000-8000-000000000001";
    await handlers.add_question_variant({
      subject_id: S,
      lesson: "tokens",
      question_id: qid,
      prompt: para,
      options: [],
    });
    expect(mockApi.post).toHaveBeenLastCalledWith(
      `/api/subjects/${S}/lessons/tokens/questions/${qid}/variants`,
      { prompt: para, options: [] },
    );
  });

  it("set_lesson_prerequisite maps 'requires' to the API's from", async () => {
    mockApi.put.mockResolvedValue({});
    await setup().handlers.set_lesson_prerequisite({
      subject_id: S,
      lesson: "vocab",
      requires: "tokens",
      reason: "r",
    });
    expect(mockApi.put).toHaveBeenCalledWith(
      `/api/subjects/${S}/lessons/vocab/prerequisites`,
      { from: "tokens", reason: "r" },
    );
  });

  it("the descriptions teach the rules an AI author must follow", () => {
    const { descriptions } = setup();
    expect(descriptions.import_lesson).toMatch(/4 to 10 numbered screens/);
    expect(descriptions.import_lesson).toMatch(/DRAFT for the owner to review/);
    expect(descriptions.import_lesson).toMatch(/variant/);
    expect(descriptions.import_lesson).toMatch(/alt text is required/);
    expect(descriptions.add_screen).toMatch(/213\.010/);
    expect(descriptions.finish_lesson).toMatch(/NEVER finish a lesson/);
    expect(descriptions.retire_screen).toMatch(/Re-point any question/);
  });

  it("accepts the compact block forms as well as the full ones", () => {
    const { shapes } = setup();
    const lesson = (blocks: unknown, option: unknown = "A right answer") => ({
      subject_id: S,
      lesson: { slug: "x", title: "X" },
      screens: [{ ref: "a", blocks }],
      questions: [
        {
          prompt: "What?",
          options: [
            { correct: true, blocks: option, reason: "Because *it is*." },
            { correct: false, blocks: "Another", reason: "No." },
          ],
          teaches: ["a"],
          covers: ["c"],
        },
      ],
    });
    const schema = z.object(shapes.import_lesson);
    const compact = lesson([
      "A **token** is a piece.",
      { type: "list", items: ["one", "two"] },
      { type: "callout", text: "Careful." },
    ]);
    expect(schema.safeParse(compact).success).toBe(true);
    expect(schema.safeParse(lesson("Just one paragraph.")).success).toBe(true);
    expect(schema.safeParse(lesson(para, para)).success).toBe(true); // the full form still works
    // Not a block at all: still refused before it reaches the server.
    expect(schema.safeParse(lesson([42])).success).toBe(false);
    expect(schema.safeParse(lesson([{ type: "nonsense" }])).success).toBe(
      false,
    );
  });

  it("teaches the compact form in the tools that take blocks", () => {
    const { descriptions } = setup();
    for (const name of ["import_lesson", "add_screen", "add_question"]) {
      expect(descriptions[name]).toMatch(/COMPACTLY/);
    }
    expect(descriptions.import_lesson).toMatch(/\*\*bold\*\*/);
  });
});
