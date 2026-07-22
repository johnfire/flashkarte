import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, post, del } from "../api";
import { logger } from "../logger";

const MARKDOWN_HELP =
  "Markdown deck format — one `# Title` line, optional `## Category` lines to " +
  "group cards, then numbered cards: a `**N. front**` line followed by the " +
  "answer on the next line(s). Number cards sequentially from 1. Keep fronts " +
  "as a single clear question and answers concise. Example:\n\n" +
  '# French Basics\n## Greetings\n**1. How do you say "hello"?**\nBonjour\n' +
  '**2. How do you say "thank you"?**\nMerci';

function asText(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

async function runTool<T>(
  toolName: string,
  action: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  logger.info("mcp.tool", "started", { toolName });
  try {
    const response = await action();
    logger.info("mcp.tool", "completed", {
      toolName,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    logger.error("mcp.tool", "failed", {
      toolName,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export function registerDeckTools(server: McpServer) {
  server.tool(
    "create_deck",
    "Create a new flashcard deck from Markdown in the user's flashkarte account. " +
      MARKDOWN_HELP,
    {
      markdown: z
        .string()
        .describe("The full deck in the flashkarte Markdown format."),
      title: z
        .string()
        .optional()
        .describe(
          "Optional title; otherwise taken from the Markdown # heading.",
        ),
    },
    async ({ markdown, title }) =>
      runTool("create_deck", async () => {
        const deck = await post("/api/decks", { markdown, title });
        return asText(deck);
      }),
  );

  server.tool(
    "add_cards",
    "Append more cards (in the Markdown card format) to an existing deck. " +
      MARKDOWN_HELP,
    {
      deck_id: z.string().uuid().describe("The deck's UUID."),
      markdown: z
        .string()
        .describe("Markdown containing the new `**N. front**` + answer cards."),
    },
    async ({ deck_id, markdown }) =>
      runTool("add_cards", async () => {
        const result = await post(
          `/api/decks/${encodeURIComponent(deck_id)}/cards`,
          { markdown },
        );
        return asText(result);
      }),
  );

  server.tool(
    "list_decks",
    "List the user's decks with card and due counts.",
    {},
    async () =>
      runTool("list_decks", async () => asText(await get("/api/decks"))),
  );

  server.tool(
    "get_deck",
    "Get a single deck and all of its cards by ID.",
    { deck_id: z.string().uuid().describe("The deck's UUID.") },
    async ({ deck_id }) =>
      runTool("get_deck", async () =>
        asText(await get(`/api/decks/${encodeURIComponent(deck_id)}`)),
      ),
  );

  server.tool(
    "delete_deck",
    "Permanently delete a deck and all of its cards.",
    { deck_id: z.string().uuid().describe("The deck's UUID.") },
    async ({ deck_id }) =>
      runTool("delete_deck", async () => {
        await del(`/api/decks/${encodeURIComponent(deck_id)}`);
        return asText({ deleted: deck_id });
      }),
  );
}
