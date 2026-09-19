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
  registerLessonTools({
    tool: (...args: unknown[]) => {
      handlers[args[0] as string] = args[args.length - 1] as Handler;
      descriptions[args[0] as string] = args[1] as string;
    },
  } as never);
  return { handlers, descriptions };
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
      "create_module",
      "delete_screen",
      "finish_lesson",
      "get_lesson",
      "get_outline",
      "get_question_insights",
      "import_lesson",
      "lint_lesson",
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
});
