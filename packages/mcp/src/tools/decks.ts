import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, post, patch, del } from "../api";
import { asText, runTool } from "./tool-runner";

const MARKDOWN_HELP =
  "Markdown deck format — one `# Title` line, optional `## Category` lines to " +
  "group cards, then numbered cards: a `**N. front**` line followed by the " +
  "answer on the next line(s). Number cards sequentially from 1. Keep fronts " +
  "as a single clear question and answers concise. Example:\n\n" +
  '# French Basics\n## Greetings\n**1. How do you say "hello"?**\nBonjour\n' +
  '**2. How do you say "thank you"?**\nMerci';

const IMAGES_HELP =
  "Images: `![alt](url)` in a front or back renders as an image, where url is " +
  "either an `https://` link or a root-relative path served by the app itself " +
  "(e.g. a bundled diagram at `/schematics/foo.svg`). Any other URL scheme " +
  "(data:, javascript:, etc.) is shown as literal text, not rendered. Use this " +
  "sparingly — only when a picture genuinely clarifies something text can't, " +
  "such as a multi-component circuit topology, e.g. `![RC lowpass filter]" +
  "(/schematics/ch1-rc-lowpass.svg)`.";

const SENSES_HELP =
  "Words with several distinct meanings: instead of one card listing them all, " +
  "write the headword once and give each meaning its own line as " +
  "`- gloss | context sentence | hint`. Each becomes its own card with its own " +
  "scheduling. While the word is being learned it is prompted by the hint " +
  "(`der Zug — Eisenbahn?`); once every meaning is known the hint drops away and " +
  "the context sentence becomes the prompt. Both extra fields are optional, but " +
  "a real context sentence is what makes the second phase work — write one per " +
  "meaning. Use this only for genuinely distinct senses (train / chess move / " +
  "draught of air), not for near-synonyms. Example:\n\n" +
  "**1. der Zug**\n" +
  "- train | Der Zug fährt um 8 Uhr ab. | Eisenbahn\n" +
  "- move (in chess) | Das war ein guter Zug! | Schach\n" +
  "- draught | Es zieht, mach das Fenster zu. | Luft";

const READING_HELP =
  "Reading cards (lessons): for the parts of learning that are just reading — " +
  "an orientation overview, background a later card assumes, a worked " +
  "explanation — put `@read` on its own line above a card. Its front is the " +
  "lesson title and the text after it is the body, kept exactly as written " +
  "(paragraphs, `- ` lists, indented code) instead of being joined into one " +
  'paragraph. The learner reads it and taps "Got it": there is no rating and ' +
  "no scheduling, and reading never counts toward mastery, so put the " +
  "questions on separate ordinary cards. Inside a body, avoid `## ` lines and " +
  "numbered `**N. ...**` lines (they start a new category or card), and don't " +
  "mix reading cards with branch (`-> label`) cards in one deck. Keep a lesson " +
  "to a few short paragraphs. Example:\n\n" +
  "@read\n" +
  "**5. How a dot product measures similarity**\n" +
  "A dot product multiplies matching entries and adds them up.\n\n" +
  "- large and positive: the vectors point the same way\n" +
  "- near zero: unrelated";

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

export function registerDeckTools(server: McpServer) {
  server.tool(
    "create_deck",
    "Create a new flashcard deck from Markdown in the user's flashkarte account. " +
      MARKDOWN_HELP +
      "\n\n" +
      IMAGES_HELP +
      "\n\n" +
      SENSES_HELP +
      "\n\n" +
      READING_HELP +
      "\n\n" +
      SPEECH_HELP +
      "\n\nPass course_id to create this deck as the next unit of an existing " +
      "flashcard deck collection (the legacy API calls it a course; see create_course) in one call, instead of " +
      "create-then-add_deck_to_course.",
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
      course_id: z
        .string()
        .uuid()
        .optional()
        .describe(
          "Optional: attach this deck to an existing flashcard deck collection as its next unit.",
        ),
      ...speechShape,
    },
    async ({ markdown, title, course_id, ...speech }) =>
      runTool("create_deck", async () => {
        const deck = await post<{ id: string }>("/api/decks", {
          markdown,
          title,
        });
        const warnings: string[] = [];

        // Creation takes Markdown only, so the speech settings and the
        // course attachment are applied as follow-up calls. A failure in
        // either must not lose the deck: report it alongside the created
        // deck rather than throwing.
        const patchBody = speechPatch(speech);
        let result: Record<string, unknown> = deck;
        if (Object.keys(patchBody).length > 0) {
          try {
            result = await patch(
              `/api/decks/${encodeURIComponent(deck.id)}`,
              patchBody,
            );
          } catch (error) {
            warnings.push(
              `Deck created, but its speech settings could not be applied: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }

        if (course_id) {
          try {
            await post(`/api/courses/${encodeURIComponent(course_id)}/decks`, {
              deck_id: deck.id,
            });
          } catch (error) {
            warnings.push(
              `Deck created, but could not be attached to course ${course_id}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }

        if (warnings.length === 0) return asText(result);
        return asText({ ...result, warnings });
      }),
  );

  server.tool(
    "add_cards",
    "Append more cards (in the Markdown card format) to an existing deck. " +
      MARKDOWN_HELP +
      "\n\n" +
      IMAGES_HELP +
      "\n\n" +
      SENSES_HELP +
      "\n\n" +
      READING_HELP,
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
    "update_card",
    "Edit one existing card in place (front/back/category/options/sense), " +
      "instead of deleting and recreating it — this preserves the card's " +
      "study progress. Only the fields you pass are changed. The whole deck " +
      "is re-validated on save, so an edit that breaks a branch route or a " +
      "sense chain is rejected with an explanation rather than silently " +
      "corrupting the deck.",
    {
      deck_id: z.string().uuid().describe("The deck's UUID."),
      card_id: z.string().uuid().describe("The card's UUID."),
      front: z
        .string()
        .optional()
        .describe("New front text (or prompt text, for a branch card)."),
      back: z
        .string()
        .optional()
        .describe("New back text. Not applicable to branch cards."),
      category: z
        .string()
        .nullable()
        .optional()
        .describe("New category, or null to clear it."),
      options: z
        .array(
          z.object({
            text: z.string().describe("The option's displayed text."),
            goto: z
              .string()
              .describe(
                "Target label to jump to, or the reserved targets " +
                  '"end" or "correct".',
              ),
          }),
        )
        .optional()
        .describe("Replaces all of a branch/diagnostic card's routed options."),
      sense: z
        .object({
          word: z.string().optional(),
          context: z.string().nullable().optional(),
          hint: z.string().nullable().optional(),
        })
        .optional()
        .describe(
          "Edits a sense card's word/context/hint. Changing `word` moves " +
            "the card to a different meaning chain; index/count within a " +
            "chain are set only by reorder_senses, not here.",
        ),
    },
    async ({ deck_id, card_id, ...patchBody }) =>
      runTool("update_card", async () =>
        asText(
          await patch(
            `/api/decks/${encodeURIComponent(deck_id)}/cards/${encodeURIComponent(card_id)}`,
            patchBody,
          ),
        ),
      ),
  );

  server.tool(
    "reorder_senses",
    "Set the display order of a word's meanings for a sense-card chain " +
      "(created via the sense-list Markdown format). Meaning 1 is shown " +
      "first while the word is still being learned. Pass every sibling " +
      "card's ID sharing this word, in the desired order — the whole set " +
      "must match exactly, or the reorder is rejected.",
    {
      deck_id: z.string().uuid().describe("The deck's UUID."),
      word: z.string().describe('The shared headword, e.g. "der Zug".'),
      order: z
        .array(z.string().uuid())
        .min(1)
        .describe("Every sibling card's UUID, in the new order."),
    },
    async ({ deck_id, word, order }) =>
      runTool("reorder_senses", async () =>
        asText(
          await patch(
            `/api/decks/${encodeURIComponent(deck_id)}/senses/${encodeURIComponent(word)}/reorder`,
            { order },
          ),
        ),
      ),
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
