import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, post, del } from "../api";

const MARKDOWN_HELP =
  "Markdown deck format — one `# Title` line, optional `## Category` lines to " +
  "group cards, then numbered cards: a `**N. front**` line followed by the " +
  "answer on the next line(s). Number cards sequentially from 1. Keep fronts " +
  "as a single clear question and answers concise. Example:\n\n" +
  '# French Basics\n## Greetings\n**1. How do you say "hello"?**\nBonjour\n' +
  '**2. How do you say "thank you"?**\nMerci';

function asText(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
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
    async ({ markdown, title }) => {
      const deck = await post("/api/decks", { markdown, title });
      return asText(deck);
    },
  );

  server.tool(
    "add_cards",
    "Append more cards (in the Markdown card format) to an existing deck. " +
      MARKDOWN_HELP,
    {
      deck_id: z.string().describe("The deck's UUID."),
      markdown: z
        .string()
        .describe("Markdown containing the new `**N. front**` + answer cards."),
    },
    async ({ deck_id, markdown }) => {
      const result = await post(`/api/decks/${deck_id}/cards`, { markdown });
      return asText(result);
    },
  );

  server.tool(
    "list_decks",
    "List the user's decks with card and due counts.",
    {},
    async () => asText(await get("/api/decks")),
  );

  server.tool(
    "get_deck",
    "Get a single deck and all of its cards by ID.",
    { deck_id: z.string().describe("The deck's UUID.") },
    async ({ deck_id }) => asText(await get(`/api/decks/${deck_id}`)),
  );

  server.tool(
    "delete_deck",
    "Permanently delete a deck and all of its cards.",
    { deck_id: z.string().describe("The deck's UUID.") },
    async ({ deck_id }) => {
      await del(`/api/decks/${deck_id}`);
      return asText({ deleted: deck_id });
    },
  );
}
