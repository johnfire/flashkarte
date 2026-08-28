import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, post, patch, del } from "../api";
import { logger } from "../logger";

const MARKDOWN_HELP =
  "Markdown deck format — one `# Title` line, optional `## Category` lines to " +
  "group cards, then numbered cards: a `**N. front**` line followed by the " +
  "answer on the next line(s). Number cards sequentially from 1. Keep fronts " +
  "as a single clear question and answers concise. Example:\n\n" +
  '# French Basics\n## Greetings\n**1. How do you say "hello"?**\nBonjour\n' +
  '**2. How do you say "thank you"?**\nMerci';

const SPEECH_HELP =
  "Spoken cards: flashkarte can read a deck aloud using the device's own " +
  "text-to-speech voices. A language deck needs TWO languages — the front and " +
  "the back are spoken separately, so a German→English deck should set " +
  "speech_front_lang to de-DE and speech_back_lang to en-GB. Setting these " +
  "when you create a language deck means the user never has to configure it. " +
  "Use BCP-47 tags (de-DE, en-GB, es-ES, ja-JP). Leave a field null to " +
  "inherit the user's own global default.";

/** Deck speech overrides, shared by create_deck and set_deck_speech. */
const speechShape = {
  speech_enabled: z
    .boolean()
    .nullable()
    .optional()
    .describe(
      "true speaks this deck even if the user's global switch is off; false " +
        "mutes just this deck; null (default) inherits the global setting.",
    ),
  speech_front_lang: z
    .string()
    .nullable()
    .optional()
    .describe("BCP-47 language of the card FRONT, e.g. de-DE."),
  speech_back_lang: z
    .string()
    .nullable()
    .optional()
    .describe("BCP-47 language of the card BACK, e.g. en-GB."),
  speech_autoplay: z
    .enum(["off", "front", "back", "both"])
    .nullable()
    .optional()
    .describe(
      "Which side is spoken without being asked. 'front' drills listening " +
        "comprehension; 'back' just gives the pronunciation of the answer.",
    ),
  speech_rate: z
    .number()
    .min(0.5)
    .max(2)
    .nullable()
    .optional()
    .describe("Speaking rate, 0.5-2. Learners often prefer ~0.8."),
};

/** Map the snake_case tool arguments onto the API's camelCase patch body. */
function speechPatch(input: {
  speech_enabled?: boolean | null;
  speech_front_lang?: string | null;
  speech_back_lang?: string | null;
  speech_autoplay?: "off" | "front" | "back" | "both" | null;
  speech_rate?: number | null;
}) {
  const patchBody: Record<string, unknown> = {};
  if (input.speech_enabled !== undefined)
    patchBody.speechEnabled = input.speech_enabled;
  if (input.speech_front_lang !== undefined)
    patchBody.speechFrontLang = input.speech_front_lang;
  if (input.speech_back_lang !== undefined)
    patchBody.speechBackLang = input.speech_back_lang;
  if (input.speech_autoplay !== undefined)
    patchBody.speechAutoplay = input.speech_autoplay;
  if (input.speech_rate !== undefined) patchBody.speechRate = input.speech_rate;
  return patchBody;
}

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
      MARKDOWN_HELP +
      "\n\n" +
      SPEECH_HELP,
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
      ...speechShape,
    },
    async ({ markdown, title, ...speech }) =>
      runTool("create_deck", async () => {
        const deck = await post<{ id: string }>("/api/decks", {
          markdown,
          title,
        });
        // Creation takes Markdown only, so the speech settings are applied as
        // a follow-up patch. A failure there must not lose the deck: report it
        // alongside the created deck rather than throwing.
        const patchBody = speechPatch(speech);
        if (Object.keys(patchBody).length === 0) return asText(deck);
        try {
          const updated = await patch(
            `/api/decks/${encodeURIComponent(deck.id)}`,
            patchBody,
          );
          return asText(updated);
        } catch (error) {
          return asText({
            ...deck,
            speech_warning: `Deck created, but its speech settings could not be applied: ${
              error instanceof Error ? error.message : String(error)
            }`,
          });
        }
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
    "set_deck_speech",
    "Set how a deck is read aloud. " + SPEECH_HELP,
    {
      deck_id: z.string().uuid().describe("The deck's UUID."),
      ...speechShape,
    },
    async ({ deck_id, ...speech }) =>
      runTool("set_deck_speech", async () =>
        asText(
          await patch(
            `/api/decks/${encodeURIComponent(deck_id)}`,
            speechPatch(speech),
          ),
        ),
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
