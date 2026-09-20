import fs from "fs";
import path from "path";
import { COURSE_AUTHORING_GUIDE } from "../guides/course-authoring-guide.generated";
import { registerAuthoringGuideTool } from "./authoring-guide";

type Handler = (
  args: Record<string, unknown>,
) => Promise<{ content: { type: string; text: string }[] }>;

function captureTools() {
  const handlers: Record<string, Handler> = {};
  const descriptions: Record<string, string> = {};
  const server = {
    tool: (...args: unknown[]) => {
      handlers[args[0] as string] = args[args.length - 1] as Handler;
      descriptions[args[0] as string] = args[1] as string;
    },
  };
  return { handlers, descriptions, server };
}

const GUIDE_FILE = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  "docs",
  "course-authoring-guide.md",
);

describe("course authoring guide", () => {
  it("registers exactly one tool, get_course_authoring_guide", () => {
    const { handlers, server } = captureTools();
    registerAuthoringGuideTool(server as never);
    expect(Object.keys(handlers)).toEqual(["get_course_authoring_guide"]);
  });

  it("returns the guide as one text block", async () => {
    const { handlers, server } = captureTools();
    registerAuthoringGuideTool(server as never);
    const result = await handlers.get_course_authoring_guide({});
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toBe(COURSE_AUTHORING_GUIDE);
  });

  it("tells the AI to read it first and states the rules that matter most", () => {
    const { descriptions, server } = captureTools();
    registerAuthoringGuideTool(server as never);
    expect(descriptions.get_course_authoring_guide).toMatch(/BEFORE building/);
    expect(COURSE_AUTHORING_GUIDE).toMatch(/draft/i);
    expect(COURSE_AUTHORING_GUIDE).toMatch(/never call `finish_lesson`/);
    expect(COURSE_AUTHORING_GUIDE).toMatch(/Ground every claim/);
  });

  it("names only tools the server really registers", async () => {
    const { registerLessonTools } = await import("./lessons");
    const { registerSubjectTools } = await import("./subjects");
    const registered = new Set<string>();
    const collect = {
      tool: (...args: unknown[]) => {
        registered.add(args[0] as string);
      },
    };
    registerLessonTools(collect as never);
    registerSubjectTools(collect as never);
    const named = new Set(
      [...COURSE_AUTHORING_GUIDE.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)]
        .map((match) => match[1])
        .filter((name) =>
          /^(import|lint|get|create|list|answer|resolve|update|add|retire|delete|set|finish)_/.test(
            name,
          ),
        ),
    );
    // `update_*` is shorthand for the update tools, not a tool name.
    named.delete("update_");
    const unknown = [...named].filter(
      (name) => !registered.has(name) && name !== "get_course_authoring_guide",
    );
    expect(unknown).toEqual([]);
  });

  it("matches docs/course-authoring-guide.md: run `npm run sync:guide -w packages/mcp` after editing it", () => {
    expect(COURSE_AUTHORING_GUIDE).toBe(fs.readFileSync(GUIDE_FILE, "utf8"));
  });
});
