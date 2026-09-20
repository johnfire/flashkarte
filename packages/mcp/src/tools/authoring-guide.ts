import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { COURSE_AUTHORING_GUIDE } from "../guides/course-authoring-guide.generated";
import { runTool } from "./tool-runner";

export function registerAuthoringGuideTool(server: McpServer) {
  server.tool(
    "get_course_authoring_guide",
    "Read this BEFORE building a structured lesson course, subject or lessons. The full method for producing a structured course " +
      "in flashkarte, as markdown: scoping, grounding in real sources, the prerequisite concept graph, turning " +
      "the graph into lessons and modules, how to write a lesson (screens, questions, variants, distractors, " +
      "formulas, images), importing and checking, how the owner reviews by learning, and how to revise. It also " +
      "states the rules: what you write is a DRAFT for the owner, never finish a lesson unless asked, and " +
      "ground every claim in a real source. Do not use it for a legacy deck course. Read-only; takes no arguments.",
    {},
    async () =>
      runTool("get_course_authoring_guide", async () => ({
        content: [{ type: "text" as const, text: COURSE_AUTHORING_GUIDE }],
      })),
  );
}
