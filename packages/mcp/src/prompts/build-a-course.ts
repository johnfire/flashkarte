import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const BUILD_FLASHCARD_COURSE_PROMPT = `The user explicitly wants a legacy flashcard course: an ordered, gated set of decks. This is not Flashkarte's structured lesson engine. For a structured course of subjects, modules, lessons, screens, and questions, use the build_lesson_course prompt instead.

Walk through this process rather than jumping straight to authoring cards:

1. Clarify the goal, the learner's starting point, and a sensible number of decks. Ask if scope is unclear.
2. Ground cards in real sources. Do not invent facts from memory.
3. Model atomic concepts and prerequisite edges. Show the learner-facing sequence for review.
4. Create the legacy deck course with create_course, then attach decks in learning order with create_deck and course_id.
5. Use straightforward cards for facts, diagnostic cards for real confusions, and reading cards for explanations.
6. Review the deck sequence with the owner before calling it done.

Legacy deck courses unlock each deck after the preceding deck is stable.`;

const BUILD_LESSON_COURSE_PROMPT = `The user wants a structured lesson course in Flashkarte. First call get_course_authoring_guide and follow it. A structured course is a subject with a prerequisite graph, taught by modules of lessons containing read screens and multiple-choice questions; it is not an ordered group of decks.

Follow the guide's checkpoints in order:

1. Clarify the learner's starting point, 3 to 7 testable outcomes, and a size cap. Ask rather than guessing.
2. Read and list the real sources. Every drafted screen must cite its source.
3. Model atomic concepts and their prerequisite edges, then call import_subject and lint_subject.
4. Stop and ask the owner to review every prerequisite edge and its reason.
5. Plan modules and 3 to 8 lessons per module. Stop and ask the owner to approve the syllabus.
6. Only then author one module at a time with import_lesson. Each lesson needs 4 to 10 screens, 3 to 5 questions, variants, reasons for every option, and checks with lint_lesson and get_outline.

Everything is a draft. Never finish a lesson unless the owner explicitly asks.`;

function promptMessage(prompt: string, goal?: string): string {
  if (!goal) return prompt;
  return `${prompt}\n\nThe user's stated goal: ${goal}`;
}

function registerCoursePrompt(
  server: McpServer,
  name: string,
  description: string,
  prompt: string,
): void {
  server.prompt(
    name,
    description,
    { goal: z.string().optional().describe("The learner's goal.") },
    ({ goal }) => ({
      messages: [
        {
          role: "user",
          content: { type: "text", text: promptMessage(prompt, goal) },
        },
      ],
    }),
  );
}

export function registerCoursePrompts(server: McpServer): void {
  registerCoursePrompt(
    server,
    "build_a_course",
    "Deprecated alias for build_flashcard_course. Builds a legacy, gated course of flashcard decks; do not use for structured lesson courses.",
    BUILD_FLASHCARD_COURSE_PROMPT,
  );
  registerCoursePrompt(
    server,
    "build_flashcard_course",
    "Builds a legacy, gated course of flashcard decks. Use only when the user explicitly requests flashcards, decks, or a legacy deck course.",
    BUILD_FLASHCARD_COURSE_PROMPT,
  );
  registerCoursePrompt(
    server,
    "build_lesson_course",
    "Builds a structured course with a subject, modules, lessons, screens, and questions. This is the default for a request to build a course.",
    BUILD_LESSON_COURSE_PROMPT,
  );
}
