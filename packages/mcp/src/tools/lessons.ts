import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, post, put, patch, del } from "../api";
import { asText, runTool } from "./tool-runner";

const BLOCKS_HELP =
  "A screen, and a question's prompt, option text and reasons, are each a list of typed blocks. " +
  'paragraph: {"type":"paragraph","spans":[{"text":"A "},{"text":"token","bold":true},{"text":" is a piece."}]} ' +
  "(spans allow only bold, italic, code flags; never put markdown inside text). " +
  'list: {"type":"list","ordered":false,"items":[[{"text":"one"}],[{"text":"two"}]]}. ' +
  'code: {"type":"code","language":"python","text":"x = 1"}. ' +
  'image: {"type":"image","src":"https://... or /schematics/x.svg","alt":"describe it","display":"inline"|"expandable"} ' +
  "(alt text is required). " +
  'callout: {"type":"callout","tone":"note"|"tip"|"warning","spans":[{"text":"..."}]}. ' +
  'formula: {"type":"formula","latex":"R = \\\\frac{V}{I}","spoken":"R equals V over I"} ' +
  "(spoken text is required before a lesson can be finished). One idea per screen.";

const LESSON_RULES =
  "A lesson is 4 to 10 numbered screens (one idea each, read not flipped), then 3 to 5 multiple-choice " +
  "questions. Each question names the screen(s) that teach it (teaches) and the concepts it tests (covers); " +
  "a wrong answer sends the learner back to those screens. Every concept the lesson covers must be tested by " +
  "at least one question. Give each question a variant (an equivalent question worded differently) so a miss " +
  "is re-asked as a different question. Each option needs a short reason shown after the pick, and exactly one " +
  "option is correct. Write for someone learning the subject from nothing, and ground every claim in a real " +
  "source: put the sources you used on the screens you drafted. What you write is a DRAFT for the owner to " +
  "review by learning it; never present it as finished.";

const STAGES_HELP =
  "Each lesson is in the testing stage (anything can change) until it is finished; a finished lesson is " +
  "additive-only: you can insert screens and edit wording (kept in a revision history), but not delete, move " +
  "or renumber, and a wrong screen is retired after its questions are re-pointed. NEVER finish a lesson " +
  "unless the owner has asked you to; finishing is their decision after reviewing it.";

const NUMBERING_HELP =
  "Screens have permanent decimal numbers that are also their order (213, 213.010, 213.020, later 213.025), " +
  "unique across the subject. You normally never choose one: add with no place to append, after: '213' or " +
  "before: '214' to insert, and the server assigns the number.";

const CHECKS_HELP =
  "The server rejects a malformed lesson (bad blocks, a question pointing at a screen that is not there) and " +
  "stores nothing. Anything merely unfinished (a concept nothing tests, a formula without spoken text) is " +
  "saved and reported back as issues; fix those before the owner finishes the lesson.";

const subjectId = z.string().uuid().describe("The subject's UUID.");
const slug = z
  .string()
  .describe("The lesson's slug: lowercase letters, digits and hyphens.");
const number = z
  .string()
  .describe('A screen number such as "213" or "213.010".');
const path = (id: string) => `/api/subjects/${encodeURIComponent(id)}`;
const lessonPath = (id: string, lesson: string) =>
  `${path(id)}/lessons/${encodeURIComponent(lesson)}`;

const blockSchema = z
  .object({
    type: z.enum(["paragraph", "list", "code", "image", "callout", "formula"]),
  })
  .passthrough();
const blocks = z
  .array(blockSchema)
  .describe("A list of blocks. " + BLOCKS_HELP);
const sourcesSchema = z
  .array(z.object({ title: z.string(), url: z.string().url().optional() }))
  .optional()
  .describe("The real sources this screen was drafted from.");
const optionSchema = z.object({
  correct: z.boolean(),
  blocks: blocks,
  reason: blocks.describe(
    "Why this option is right or wrong, shown after the pick.",
  ),
});
const optionsSchema = z
  .array(optionSchema)
  .describe("Two or more options, exactly one correct.");
const slugList = z
  .array(z.string())
  .describe("Concept slugs from the subject.");

export function registerLessonTools(server: McpServer) {
  server.tool(
    "import_lesson",
    "Create a whole lesson in one call, atomically: the module (found by title or created), the lesson, its " +
      "prerequisites, every screen, and every question with its variants. Nothing is created if anything is " +
      "malformed. Screens may carry a local `ref` so questions can name the screen that teaches them " +
      "before numbers exist; questions reference them in `teaches`. " +
      LESSON_RULES +
      " " +
      NUMBERING_HELP +
      " " +
      CHECKS_HELP +
      " " +
      BLOCKS_HELP,
    {
      subject_id: subjectId,
      module: z.string().optional().describe("Module title; found or created."),
      lesson: z.object({
        slug,
        title: z.string(),
        summary: z
          .string()
          .optional()
          .describe("One or two sentences: what the learner will learn."),
        covers: slugList
          .optional()
          .describe(
            "The concepts this lesson teaches: its coverage checklist.",
          ),
        prerequisites: z
          .array(z.object({ lesson: z.string(), reason: z.string() }))
          .optional()
          .describe("Lessons that must be passed first, each with the reason."),
      }),
      screens: z.array(
        z.object({
          ref: z.string().optional(),
          blocks,
          sources: sourcesSchema,
        }),
      ),
      questions: z.array(
        z.object({
          prompt: blocks,
          options: optionsSchema,
          teaches: z
            .array(z.string())
            .describe("Screen refs (or numbers) that teach it."),
          covers: slugList,
          variants: z
            .array(z.object({ prompt: blocks, options: optionsSchema }))
            .optional(),
        }),
      ),
    },
    async ({ subject_id, ...body }) =>
      runTool("import_lesson", async () =>
        asText(await post(`${path(subject_id)}/lessons/import`, body)),
      ),
  );

  server.tool(
    "get_lesson",
    "Get one lesson in full: its screens (numbered, with blocks), questions and variants, coverage, " +
      "prerequisites, stage, and the issues still to fix.",
    { subject_id: subjectId, lesson: slug },
    async ({ subject_id, lesson }) =>
      runTool("get_lesson", async () =>
        asText(await get(lessonPath(subject_id, lesson))),
      ),
  );

  server.tool(
    "lint_lesson",
    "Check a lesson: structural problems (which block any save), completeness problems (which block only " +
      "finishing) and warnings (advice). A clean result means consistent, not well taught.",
    { subject_id: subjectId, lesson: slug },
    async ({ subject_id, lesson }) =>
      runTool("lint_lesson", async () =>
        asText(await get(`${lessonPath(subject_id, lesson)}/lint`)),
      ),
  );

  server.tool(
    "get_outline",
    "The course outline for a subject: modules, and the lessons in prerequisite order with what each " +
      "covers and what unlocks it. Derived from the lesson graph.",
    { subject_id: subjectId },
    async ({ subject_id }) =>
      runTool("get_outline", async () =>
        asText(await get(`${path(subject_id)}/outline`)),
      ),
  );

  server.tool(
    "create_module",
    "Create a module: a named group of lessons for browsing (for example 'Input side: text to vectors').",
    { subject_id: subjectId, title: z.string() },
    async ({ subject_id, title }) =>
      runTool("create_module", async () =>
        asText(await post(`${path(subject_id)}/modules`, { title })),
      ),
  );

  server.tool(
    "add_screen",
    "Add one screen to a lesson. " +
      NUMBERING_HELP +
      " Allowed in both stages. " +
      BLOCKS_HELP,
    {
      subject_id: subjectId,
      lesson: slug,
      blocks,
      after: z
        .string()
        .optional()
        .describe("Insert directly after this screen number."),
      before: z
        .string()
        .optional()
        .describe("Insert directly before this screen number."),
      sources: sourcesSchema,
    },
    async ({
      subject_id,
      lesson,
      blocks: screenBlocks,
      after,
      before,
      sources,
    }) =>
      runTool("add_screen", async () =>
        asText(
          await post(`${lessonPath(subject_id, lesson)}/screens`, {
            blocks: screenBlocks,
            place: after || before ? { after, before } : undefined,
            sources,
          }),
        ),
      ),
  );

  server.tool(
    "update_screen",
    "Edit a screen's content (the previous version is kept in its revision history, in either stage). To move " +
      "it to a different number pass `number` (testing stage only). " +
      BLOCKS_HELP,
    {
      subject_id: subjectId,
      number,
      blocks: blocks.optional(),
      new_number: z.string().optional().describe("Testing stage only."),
    },
    async ({
      subject_id,
      number: screenNumber,
      blocks: screenBlocks,
      new_number,
    }) =>
      runTool("update_screen", async () =>
        asText(
          await patch(
            `${path(subject_id)}/screens/${encodeURIComponent(screenNumber)}`,
            {
              blocks: screenBlocks,
              number: new_number,
            },
          ),
        ),
      ),
  );

  server.tool(
    "retire_screen",
    "Hide a wrong screen from new learners while keeping it (and its history) for anyone whose progress points " +
      "at it. Re-point any question that teaches it to the replacement screen first. This is how a finished " +
      "lesson fixes a screen.",
    { subject_id: subjectId, number },
    async ({ subject_id, number: screenNumber }) =>
      runTool("retire_screen", async () =>
        asText(
          await post(
            `${path(subject_id)}/screens/${encodeURIComponent(screenNumber)}/retire`,
          ),
        ),
      ),
  );

  server.tool(
    "delete_screen",
    "Delete a screen. Testing stage only, and only if no question teaches it.",
    { subject_id: subjectId, number },
    async ({ subject_id, number: screenNumber }) =>
      runTool("delete_screen", async () => {
        await del(
          `${path(subject_id)}/screens/${encodeURIComponent(screenNumber)}`,
        );
        return asText({ deleted: screenNumber });
      }),
  );

  server.tool(
    "add_question",
    "Add a multiple-choice question to a lesson. Allowed in both stages. " +
      LESSON_RULES +
      " " +
      BLOCKS_HELP,
    {
      subject_id: subjectId,
      lesson: slug,
      prompt: blocks,
      options: optionsSchema,
      teaches: z.array(z.string()).describe("Screen numbers that teach it."),
      covers: slugList,
      variants: z
        .array(z.object({ prompt: blocks, options: optionsSchema }))
        .optional(),
    },
    async ({ subject_id, lesson, ...body }) =>
      runTool("add_question", async () =>
        asText(await post(`${lessonPath(subject_id, lesson)}/questions`, body)),
      ),
  );

  server.tool(
    "add_question_variant",
    "Add an equivalent question, worded differently, to an existing question. It inherits that question's " +
      "teaching screens and concepts, so only give the prompt and options.",
    {
      subject_id: subjectId,
      lesson: slug,
      question_id: z.string().uuid(),
      prompt: blocks,
      options: optionsSchema,
    },
    async ({ subject_id, lesson, question_id, prompt, options }) =>
      runTool("add_question_variant", async () =>
        asText(
          await post(
            `${lessonPath(subject_id, lesson)}/questions/${encodeURIComponent(question_id)}/variants`,
            {
              prompt,
              options,
            },
          ),
        ),
      ),
  );

  server.tool(
    "update_question",
    "Edit a question's wording, options, teaching screens (`teaches`) or tested concepts (`covers`). Allowed in " +
      "both stages; re-pointing `teaches` is how you swap in a replacement screen before retiring the old one.",
    {
      subject_id: subjectId,
      lesson: slug,
      question_id: z.string().uuid(),
      prompt: blocks.optional(),
      options: optionsSchema.optional(),
      teaches: z.array(z.string()).optional(),
      covers: slugList.optional(),
    },
    async ({ subject_id, lesson, question_id, ...body }) =>
      runTool("update_question", async () =>
        asText(
          await patch(
            `${lessonPath(subject_id, lesson)}/questions/${encodeURIComponent(question_id)}`,
            body,
          ),
        ),
      ),
  );

  server.tool(
    "set_lesson_prerequisite",
    "Say that a lesson requires another lesson to be passed first, with the reason. Rejected if it would " +
      "create a cycle, and only allowed while the dependent lesson is in the testing stage.",
    {
      subject_id: subjectId,
      lesson: slug.describe("The dependent lesson."),
      requires: z.string().describe("The prerequisite lesson's slug."),
      reason: z.string(),
    },
    async ({ subject_id, lesson, requires, reason }) =>
      runTool("set_lesson_prerequisite", async () =>
        asText(
          await put(`${lessonPath(subject_id, lesson)}/prerequisites`, {
            from: requires,
            reason,
          }),
        ),
      ),
  );

  server.tool(
    "finish_lesson",
    "Move a lesson from testing to finished. " +
      STAGES_HELP +
      " Refused with the list of what is missing if the lesson is not complete.",
    { subject_id: subjectId, lesson: slug },
    async ({ subject_id, lesson }) =>
      runTool("finish_lesson", async () =>
        asText(await post(`${lessonPath(subject_id, lesson)}/finish`)),
      ),
  );
}
