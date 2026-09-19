import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, post, patch, del } from "../api";
import { asText, runTool } from "./tool-runner";

const GATING_HELP =
  "Courses gate cross-deck: deck N+1 unlocks only once every card in deck N " +
  "is stable (repeated correctly enough times without lapsing). get_course " +
  "reports each deck's lock state so you can tell the user what's next and " +
  "what's still locked.";

export function registerCourseTools(server: McpServer) {
  server.tool(
    "create_course",
    "Create a new course: an ordered, gated grouping of decks for a learner's " +
      'goal (e.g. "Intro to Circuit Analysis"). Build it out by creating ' +
      "each unit as a deck with create_deck's course_id, in learning order. " +
      GATING_HELP,
    {
      title: z.string().describe("The course's title."),
      description: z
        .string()
        .optional()
        .describe("Optional: what this course teaches and who it's for."),
    },
    async ({ title, description }) =>
      runTool("create_course", async () =>
        asText(await post("/api/courses", { title, description })),
      ),
  );

  server.tool(
    "list_courses",
    "List the user's courses, each with a decks_total / decks_mastered summary.",
    {},
    async () =>
      runTool("list_courses", async () => asText(await get("/api/courses"))),
  );

  server.tool(
    "get_course",
    "Get a course's full detail: its ordered decks, each with card_count, " +
      "mastered_count, and locked. " +
      GATING_HELP,
    { course_id: z.string().uuid().describe("The course's UUID.") },
    async ({ course_id }) =>
      runTool("get_course", async () =>
        asText(await get(`/api/courses/${encodeURIComponent(course_id)}`)),
      ),
  );

  server.tool(
    "update_course",
    "Rename a course, edit its description, or publish/unpublish it. Only " +
      "the fields you pass are changed.",
    {
      course_id: z.string().uuid().describe("The course's UUID."),
      title: z.string().optional().describe("New title."),
      description: z
        .string()
        .nullable()
        .optional()
        .describe("New description, or null to clear it."),
      is_public: z
        .boolean()
        .optional()
        .describe(
          "true publishes the course (and its decks, when cloned) for " +
            "anyone to browse and clone; false makes it private again.",
        ),
    },
    async ({ course_id, title, description, is_public }) =>
      runTool("update_course", async () => {
        const body: Record<string, unknown> = {};
        if (title !== undefined) body.title = title;
        if (description !== undefined) body.description = description;
        if (is_public !== undefined) body.isPublic = is_public;
        return asText(
          await patch(`/api/courses/${encodeURIComponent(course_id)}`, body),
        );
      }),
  );

  server.tool(
    "delete_course",
    "Permanently delete a course. Its member decks are NOT deleted -- they " +
      "just stop being grouped/gated, and stay in the user's own deck list.",
    { course_id: z.string().uuid().describe("The course's UUID.") },
    async ({ course_id }) =>
      runTool("delete_course", async () => {
        await del(`/api/courses/${encodeURIComponent(course_id)}`);
        return asText({ deleted: course_id });
      }),
  );

  server.tool(
    "add_deck_to_course",
    "Attach an existing deck to a course, appending it as the new last unit. " +
      "Prefer create_deck's course_id when authoring a new unit from scratch " +
      "-- reach for this only to add an already-existing deck.",
    {
      course_id: z.string().uuid().describe("The course's UUID."),
      deck_id: z.string().uuid().describe("The deck's UUID."),
    },
    async ({ course_id, deck_id }) =>
      runTool("add_deck_to_course", async () =>
        asText(
          await post(`/api/courses/${encodeURIComponent(course_id)}/decks`, {
            deck_id,
          }),
        ),
      ),
  );

  server.tool(
    "remove_deck_from_course",
    "Detach a deck from a course. The deck itself is not deleted.",
    {
      course_id: z.string().uuid().describe("The course's UUID."),
      deck_id: z.string().uuid().describe("The deck's UUID."),
    },
    async ({ course_id, deck_id }) =>
      runTool("remove_deck_from_course", async () => {
        await del(
          `/api/courses/${encodeURIComponent(course_id)}/decks/${encodeURIComponent(deck_id)}`,
        );
        return asText({ course_id, deck_id, removed: true });
      }),
  );

  server.tool(
    "reorder_course_decks",
    "Set the learning order of a course's decks. Pass every member deck's " +
      "ID, in the desired order -- the whole set must match exactly, or the " +
      "reorder is rejected.",
    {
      course_id: z.string().uuid().describe("The course's UUID."),
      deck_ids: z
        .array(z.string().uuid())
        .min(1)
        .describe("Every member deck's UUID, in the new order."),
    },
    async ({ course_id, deck_ids }) =>
      runTool("reorder_course_decks", async () =>
        asText(
          await patch(
            `/api/courses/${encodeURIComponent(course_id)}/decks/reorder`,
            { order: deck_ids },
          ),
        ),
      ),
  );
}
