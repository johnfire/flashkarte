import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { get, post, put, del } from "../api";
import { cardReferenceSchema, resolveCardIds } from "./card-references";
import { asText, runTool } from "./tool-runner";

const GRAPH_RULES =
  "A subject is a prerequisite graph, and it is a HYPOTHESIS the user must " +
  "review, not a fact. Concepts are atomic: one thing assessable by one " +
  'question (split anything that needs "and"). kind: term (vocabulary), ' +
  "idea (a relationship or mechanism), skill (a procedure or calculation), " +
  "map (an ungated orientation overview, read first), capstone (needs many " +
  "concepts together), assumption (knowledge the course does NOT teach but " +
  "relies on, e.g. matrix multiplication; it never blocks). tier: core or " +
  "extension. An edge from A to B means B REQUIRES A only if a bright " +
  "newcomer could not follow B's explanation without A; if A merely helps, " +
  'use strength "suggests" (orders the route, never locks). Data-flow order ' +
  "is not learning order. Every requires edge needs a one-sentence reason. " +
  "Aim for at most 4 requires parents per concept. Slugs are lowercase " +
  "letters, digits and hyphens, and cannot change once created. The whole method is in " +
  "get_course_authoring_guide.";

const CARD_REFERENCE_HELP =
  "Cards are named by UUID, or as {deck_id, card_number} where card_number " +
  "is the number the app shows on the card (1-based).";

const conceptShape = {
  slug: z.string().describe("Stable id, e.g. kv-cache."),
  name: z.string().describe("Human-readable name."),
  kind: z.enum(["term", "idea", "skill", "map", "capstone", "assumption"]),
  tier: z.enum(["core", "extension"]).optional().describe("Default core."),
};

const edgeShape = {
  from: z.string().describe("Slug of the PREREQUISITE concept."),
  to: z.string().describe("Slug of the DEPENDENT concept."),
  strength: z.enum(["requires", "suggests"]),
  reason: z
    .string()
    .optional()
    .describe("Required for requires: why B cannot be followed without A."),
};

const subjectId = z.string().uuid().describe("The subject's UUID.");
const path = (id: string) => `/api/subjects/${encodeURIComponent(id)}`;

export function registerSubjectTools(server: McpServer) {
  server.tool(
    "create_subject",
    "Create an empty subject (a prerequisite graph for one area of " +
      "knowledge). Prefer import_subject to create a whole graph at once. " +
      GRAPH_RULES,
    {
      title: z.string().describe("The subject's title."),
      description: z.string().optional().describe("What it covers."),
    },
    async ({ title, description }) =>
      runTool("create_subject", async () =>
        asText(await post("/api/subjects", { title, description })),
      ),
  );

  server.tool(
    "list_subjects",
    "List the user's subjects, each with its concept count.",
    {},
    async () =>
      runTool("list_subjects", async () => asText(await get("/api/subjects"))),
  );

  server.tool(
    "get_subject",
    "Get a subject with all its concepts and prerequisite edges (by slug).",
    { subject_id: subjectId },
    async ({ subject_id }) =>
      runTool("get_subject", async () => asText(await get(path(subject_id)))),
  );

  server.tool(
    "create_course_family",
    "Promote a subject to the canonical edition of a multilingual course. Existing lessons stay in place; later editions receive the same concept graph with translated names.",
    {
      subject_id: subjectId,
      locale: z
        .string()
        .describe("Canonical edition locale, such as en or de."),
    },
    async ({ subject_id, locale }) =>
      runTool("create_course_family", async () =>
        asText(await post(`${path(subject_id)}/course-family`, { locale })),
      ),
  );

  server.tool(
    "create_localized_edition",
    "Create a translated subject edition from a canonical course. It copies the canonical concept graph by stable slug; author translated modules, lessons, screens and questions afterwards. Learner progress stays separate per edition. Shared diagrams remain usable by every edition in the course family.",
    {
      subject_id: subjectId,
      locale: z.string().describe("Edition locale, such as de."),
      title: z.string(),
      description: z.string().optional(),
      concept_names: z
        .record(z.string(), z.string())
        .describe(
          "One localized display name for every canonical concept slug.",
        ),
    },
    async ({ subject_id, ...body }) =>
      runTool("create_localized_edition", async () =>
        asText(await post(`${path(subject_id)}/editions`, body)),
      ),
  );

  server.tool(
    "list_course_editions",
    "List every language edition in the course family that contains this subject.",
    { subject_id: subjectId },
    async ({ subject_id }) =>
      runTool("list_course_editions", async () =>
        asText(await get(`${path(subject_id)}/editions`)),
      ),
  );

  server.tool(
    "import_subject",
    "Create a whole subject in one call: concepts, prerequisite edges with " +
      "reasons, and the cards that assess each concept. All-or-nothing: the " +
      "graph is linted first (cycles, unknown concepts, a requires edge " +
      "without a reason are rejected) and nothing is created on failure. " +
      "Advisories (e.g. too many requires parents) come back with the " +
      "result. After importing, ask the user to review the edges. " +
      GRAPH_RULES +
      " " +
      CARD_REFERENCE_HELP,
    {
      title: z.string(),
      description: z.string().optional(),
      concepts: z
        .array(
          z.object({
            ...conceptShape,
            cards: z
              .array(cardReferenceSchema)
              .optional()
              .describe("Cards that assess this concept."),
          }),
        )
        .describe("In authoring order; the order breaks route ties."),
      edges: z.array(z.object(edgeShape)),
    },
    async ({ title, description, concepts, edges }) =>
      runTool("import_subject", async () => {
        const resolved = await Promise.all(
          concepts.map(async ({ cards, ...concept }) => ({
            ...concept,
            cards: await resolveCardIds(cards ?? []),
          })),
        );
        return asText(
          await post("/api/subjects/import", {
            title,
            description,
            concepts: resolved,
            edges,
          }),
        );
      }),
  );

  server.tool(
    "add_concept",
    "Add one concept to a subject. " + GRAPH_RULES,
    { subject_id: subjectId, ...conceptShape },
    async ({ subject_id, ...concept }) =>
      runTool("add_concept", async () =>
        asText(await post(`${path(subject_id)}/concepts`, concept)),
      ),
  );

  server.tool(
    "set_prerequisite",
    "Add or update one prerequisite edge between two concepts of a subject. " +
      "Rejected if it would create a cycle. " +
      GRAPH_RULES,
    { subject_id: subjectId, ...edgeShape },
    async ({ subject_id, ...edge }) =>
      runTool("set_prerequisite", async () =>
        asText(await put(`${path(subject_id)}/edges`, edge)),
      ),
  );

  server.tool(
    "remove_prerequisite",
    "Remove one prerequisite edge.",
    {
      subject_id: subjectId,
      from: z.string().describe("Slug of the prerequisite concept."),
      to: z.string().describe("Slug of the dependent concept."),
    },
    async ({ subject_id, from, to }) =>
      runTool("remove_prerequisite", async () => {
        await del(
          `${path(subject_id)}/edges/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
        );
        return asText({ removed: { from, to } });
      }),
  );

  server.tool(
    "link_concept_cards",
    "Replace the set of cards attached to a concept. Mastery is computed from " +
      "the ordinary question cards; reading cards (lessons, `@read`) linked " +
      "here are offered to the learner first but never count toward mastery " +
      "and never lock anything. Link every card that tests the concept, plus " +
      "any lesson that teaches it. " +
      CARD_REFERENCE_HELP,
    {
      subject_id: subjectId,
      slug: z.string().describe("The concept's slug."),
      cards: z.array(cardReferenceSchema),
    },
    async ({ subject_id, slug, cards }) =>
      runTool("link_concept_cards", async () =>
        asText(
          await put(
            `${path(subject_id)}/concepts/${encodeURIComponent(slug)}/cards`,
            { card_ids: await resolveCardIds(cards) },
          ),
        ),
      ),
  );

  server.tool(
    "lint_subject",
    "Check a subject's graph for defects: cycles, edges to unknown " +
      "concepts, requires edges without a reason, concepts with too many " +
      "requires parents. A clean lint means the graph is consistent, NOT " +
      "that its edges are correct; the user still has to review them.",
    { subject_id: subjectId },
    async ({ subject_id }) =>
      runTool("lint_subject", async () =>
        asText(await get(`${path(subject_id)}/lint`)),
      ),
  );

  server.tool(
    "get_subject_progress",
    "Where the learner stands in a subject: every concept in route order " +
      "(prerequisites first) with state mastered / available / locked, " +
      "the frontier (what to study next), and a summary. A concept is " +
      "mastered when all its question cards are stable; is_unassessed " +
      "means it has no question cards yet. needs_reading means an unread " +
      "lesson (reading card) is waiting: tell the learner to read it before " +
      "practising. A concept with only lessons is done once they are read.",
    { subject_id: subjectId },
    async ({ subject_id }) =>
      runTool("get_subject_progress", async () =>
        asText(await get(`${path(subject_id)}/progress`)),
      ),
  );

  server.tool(
    "delete_subject",
    "Permanently delete a subject with its concepts and edges. The cards " +
      "and decks are NOT deleted.",
    { subject_id: subjectId },
    async ({ subject_id }) =>
      runTool("delete_subject", async () => {
        await del(path(subject_id));
        return asText({ deleted: subject_id });
      }),
  );
}
