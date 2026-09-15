import { registerCourseTools } from "./courses";
import * as apiModule from "../api";

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  del: jest.fn(),
}));

const mockApi = apiModule as jest.Mocked<typeof apiModule>;

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

/** Captures tool handlers the way McpServer.tool would register them. */
function captureTools(): {
  handlers: Record<string, Handler>;
  server: { tool: (...args: unknown[]) => void };
} {
  const handlers: Record<string, Handler> = {};
  const server = {
    tool: (...args: unknown[]) => {
      const name = args[0] as string;
      handlers[name] = args[args.length - 1] as Handler;
    },
  };
  return { handlers, server };
}

function textOf(result: unknown) {
  return JSON.parse(
    (result as { content: { text: string }[] }).content[0].text,
  );
}

describe("course MCP tools", () => {
  beforeEach(() => jest.clearAllMocks());

  test("registers the course tools", () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    expect(Object.keys(handlers).sort()).toEqual([
      "add_deck_to_course",
      "create_course",
      "delete_course",
      "get_course",
      "list_courses",
      "remove_deck_from_course",
      "reorder_course_decks",
      "update_course",
    ]);
  });

  test("create_course POSTs to /api/courses", async () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    mockApi.post.mockResolvedValue({ id: "c1" });
    await handlers.create_course({ title: "Circuits 101" });
    expect(mockApi.post).toHaveBeenCalledWith("/api/courses", {
      title: "Circuits 101",
      description: undefined,
    });
  });

  test("list_courses GETs /api/courses", async () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    mockApi.get.mockResolvedValue([{ id: "c1" }]);
    const result = await handlers.list_courses({});
    expect(mockApi.get).toHaveBeenCalledWith("/api/courses");
    expect(textOf(result)).toEqual([{ id: "c1" }]);
  });

  test("get_course GETs /api/courses/:id", async () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    mockApi.get.mockResolvedValue({ id: "c1", decks: [] });
    await handlers.get_course({ course_id: "c1" });
    expect(mockApi.get).toHaveBeenCalledWith("/api/courses/c1");
  });

  test("update_course only sends the fields given", async () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    mockApi.patch.mockResolvedValue({ id: "c1" });
    await handlers.update_course({ course_id: "c1", is_public: true });
    expect(mockApi.patch).toHaveBeenCalledWith("/api/courses/c1", {
      isPublic: true,
    });
  });

  test("delete_course DELETEs /api/courses/:id", async () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    mockApi.del.mockResolvedValue(undefined);
    const result = await handlers.delete_course({ course_id: "c1" });
    expect(mockApi.del).toHaveBeenCalledWith("/api/courses/c1");
    expect(textOf(result)).toEqual({ deleted: "c1" });
  });

  test("add_deck_to_course POSTs {deck_id} to /api/courses/:id/decks", async () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    mockApi.post.mockResolvedValue({ course_id: "c1", deck_id: "d1" });
    await handlers.add_deck_to_course({ course_id: "c1", deck_id: "d1" });
    expect(mockApi.post).toHaveBeenCalledWith("/api/courses/c1/decks", {
      deck_id: "d1",
    });
  });

  test("remove_deck_from_course DELETEs the course/deck pair", async () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    mockApi.del.mockResolvedValue(undefined);
    await handlers.remove_deck_from_course({ course_id: "c1", deck_id: "d1" });
    expect(mockApi.del).toHaveBeenCalledWith("/api/courses/c1/decks/d1");
  });

  test("reorder_course_decks PATCHes the new order", async () => {
    const { handlers, server } = captureTools();
    registerCourseTools(server as never);
    mockApi.patch.mockResolvedValue({ course_id: "c1", order: ["d2", "d1"] });
    await handlers.reorder_course_decks({
      course_id: "c1",
      deck_ids: ["d2", "d1"],
    });
    expect(mockApi.patch).toHaveBeenCalledWith(
      "/api/courses/c1/decks/reorder",
      { order: ["d2", "d1"] },
    );
  });
});
