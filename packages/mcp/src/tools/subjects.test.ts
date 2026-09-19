import * as apiModule from "../api";
import { registerSubjectTools } from "./subjects";

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));
const mockApi = apiModule as jest.Mocked<typeof apiModule>;

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

function captureTools() {
  const handlers: Record<string, Handler> = {};
  const server = {
    tool: (...args: unknown[]) => {
      handlers[args[0] as string] = args[args.length - 1] as Handler;
    },
  };
  return { handlers, server };
}

const SUBJECT = "10000000-0000-4000-8000-000000000001";
const DECK = "20000000-0000-4000-8000-000000000001";
const CARD_18 = "30000000-0000-4000-8000-000000000018";
const edge = {
  from: "token",
  to: "embedding",
  strength: "requires",
  reason: "an embedding is what a token id becomes",
};

function setup() {
  const { handlers, server } = captureTools();
  registerSubjectTools(server as never);
  return handlers;
}

describe("subject MCP tools", () => {
  beforeEach(() => jest.clearAllMocks());

  it("registers the subject tools", () => {
    expect(Object.keys(setup()).sort()).toEqual([
      "add_concept",
      "create_subject",
      "delete_subject",
      "get_subject",
      "get_subject_progress",
      "import_subject",
      "link_concept_cards",
      "lint_subject",
      "list_subjects",
      "remove_prerequisite",
      "set_prerequisite",
    ]);
  });

  it("import_subject resolves card numbers to ids before posting", async () => {
    mockApi.get.mockResolvedValue({ cards: [{ id: CARD_18, position: 17 }] });
    mockApi.post.mockResolvedValue({ concept_count: 2 });
    await setup().import_subject({
      title: "Transformers",
      concepts: [
        {
          slug: "token",
          name: "Token",
          kind: "term",
          cards: [{ deck_id: DECK, card_number: 18 }],
        },
        { slug: "embedding", name: "Embedding", kind: "idea" },
      ],
      edges: [edge],
    });
    expect(mockApi.get).toHaveBeenCalledTimes(1);
    expect(mockApi.post).toHaveBeenCalledWith("/api/subjects/import", {
      title: "Transformers",
      description: undefined,
      concepts: [
        { slug: "token", name: "Token", kind: "term", cards: [CARD_18] },
        { slug: "embedding", name: "Embedding", kind: "idea", cards: [] },
      ],
      edges: [edge],
    });
  });

  it("import_subject posts nothing when a card number does not exist", async () => {
    mockApi.get.mockResolvedValue({ cards: [{ id: CARD_18, position: 17 }] });
    await expect(
      setup().import_subject({
        title: "T",
        concepts: [
          {
            slug: "token",
            name: "Token",
            kind: "term",
            cards: [{ deck_id: DECK, card_number: 99 }],
          },
        ],
        edges: [],
      }),
    ).rejects.toThrow(/no card number 99/);
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it("set_prerequisite puts the edge under the subject", async () => {
    mockApi.put.mockResolvedValue(edge);
    await setup().set_prerequisite({ subject_id: SUBJECT, ...edge });
    expect(mockApi.put).toHaveBeenCalledWith(
      `/api/subjects/${SUBJECT}/edges`,
      edge,
    );
  });

  it("remove_prerequisite deletes by both slugs", async () => {
    mockApi.del.mockResolvedValue(undefined);
    await setup().remove_prerequisite({
      subject_id: SUBJECT,
      from: "token",
      to: "embedding",
    });
    expect(mockApi.del).toHaveBeenCalledWith(
      `/api/subjects/${SUBJECT}/edges/token/embedding`,
    );
  });

  it("link_concept_cards sends resolved card ids", async () => {
    mockApi.get.mockResolvedValue({ cards: [{ id: CARD_18, position: 17 }] });
    mockApi.put.mockResolvedValue({});
    await setup().link_concept_cards({
      subject_id: SUBJECT,
      slug: "token",
      cards: [{ deck_id: DECK, card_number: 18 }],
    });
    expect(mockApi.put).toHaveBeenCalledWith(
      `/api/subjects/${SUBJECT}/concepts/token/cards`,
      { card_ids: [CARD_18] },
    );
  });

  it("reads progress and lint from the subject's endpoints", async () => {
    mockApi.get.mockResolvedValue({});
    const handlers = setup();
    await handlers.get_subject_progress({ subject_id: SUBJECT });
    await handlers.lint_subject({ subject_id: SUBJECT });
    expect(mockApi.get).toHaveBeenNthCalledWith(
      1,
      `/api/subjects/${SUBJECT}/progress`,
    );
    expect(mockApi.get).toHaveBeenNthCalledWith(
      2,
      `/api/subjects/${SUBJECT}/lint`,
    );
  });
});
