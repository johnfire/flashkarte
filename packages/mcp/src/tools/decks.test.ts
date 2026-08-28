import { registerDeckTools } from "./decks";
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

describe("deck MCP tools", () => {
  beforeEach(() => jest.clearAllMocks());

  test("registers the deck tools", () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    expect(Object.keys(handlers).sort()).toEqual([
      "add_cards",
      "create_deck",
      "delete_deck",
      "get_deck",
      "list_decks",
      "set_deck_speech",
    ]);
  });

  test("create_deck POSTs markdown to /api/decks", async () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    mockApi.post.mockResolvedValue({ id: "d1" });
    await handlers.create_deck({ markdown: "# D\n**1. Q**\nA", title: "D" });
    expect(mockApi.post).toHaveBeenCalledWith("/api/decks", {
      markdown: "# D\n**1. Q**\nA",
      title: "D",
    });
  });

  test("create_deck applies speech settings as a follow-up patch", async () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    mockApi.post.mockResolvedValue({ id: "d1" });
    mockApi.patch.mockResolvedValue({ id: "d1", speech_front_lang: "de-DE" });

    await handlers.create_deck({
      markdown: "# D\n**1. Q**\nA",
      speech_enabled: true,
      speech_front_lang: "de-DE",
      speech_back_lang: "en-GB",
    });

    expect(mockApi.patch).toHaveBeenCalledWith("/api/decks/d1", {
      speechEnabled: true,
      speechFrontLang: "de-DE",
      speechBackLang: "en-GB",
    });
  });

  test("create_deck without speech args never patches", async () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    mockApi.post.mockResolvedValue({ id: "d1" });

    await handlers.create_deck({ markdown: "# D\n**1. Q**\nA" });

    expect(mockApi.patch).not.toHaveBeenCalled();
  });

  test("a failed speech patch still reports the created deck", async () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    mockApi.post.mockResolvedValue({ id: "d1" });
    mockApi.patch.mockRejectedValue(new Error("422 bad tag"));

    const result = (await handlers.create_deck({
      markdown: "# D\n**1. Q**\nA",
      speech_front_lang: "de-DE",
    })) as { content: { text: string }[] };

    const payload = JSON.parse(result.content[0].text);
    expect(payload.id).toBe("d1");
    expect(payload.speech_warning).toMatch(/422 bad tag/);
  });

  test("set_deck_speech PATCHes only the fields given", async () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    mockApi.patch.mockResolvedValue({ id: "d1" });

    await handlers.set_deck_speech({
      deck_id: "d1",
      speech_enabled: false,
    });

    expect(mockApi.patch).toHaveBeenCalledWith("/api/decks/d1", {
      speechEnabled: false,
    });
  });

  test("add_cards POSTs to /api/decks/:id/cards", async () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    mockApi.post.mockResolvedValue({ added: 1 });
    await handlers.add_cards({ deck_id: "d1", markdown: "**1. Q**\nA" });
    expect(mockApi.post).toHaveBeenCalledWith("/api/decks/d1/cards", {
      markdown: "**1. Q**\nA",
    });
  });

  test("list_decks GETs /api/decks", async () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    mockApi.get.mockResolvedValue([]);
    await handlers.list_decks({});
    expect(mockApi.get).toHaveBeenCalledWith("/api/decks");
  });

  test("delete_deck DELETEs /api/decks/:id", async () => {
    const { handlers, server } = captureTools();
    registerDeckTools(server as never);
    mockApi.del.mockResolvedValue(undefined);
    await handlers.delete_deck({ deck_id: "d1" });
    expect(mockApi.del).toHaveBeenCalledWith("/api/decks/d1");
  });

  test("create_deck description shows a concrete card example", () => {
    const descriptions: Record<string, string> = {};
    const server = {
      tool: (...args: unknown[]) => {
        descriptions[args[0] as string] = args[1] as string;
      },
    };
    registerDeckTools(
      server as unknown as Parameters<typeof registerDeckTools>[0],
    );
    expect(descriptions["create_deck"]).toContain("**1.");
    expect(descriptions["create_deck"]).toContain("# ");
  });
});
