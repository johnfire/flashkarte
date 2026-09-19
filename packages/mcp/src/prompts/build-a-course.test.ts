import { registerCoursePrompts } from "./build-a-course";

type PromptCallback = (args: Record<string, unknown>) => {
  messages: { role: string; content: { type: string; text: string } }[];
};

function capturePrompts(): {
  handlers: Record<string, PromptCallback>;
  server: { prompt: (...args: unknown[]) => void };
} {
  const handlers: Record<string, PromptCallback> = {};
  const server = {
    prompt: (...args: unknown[]) => {
      const name = args[0] as string;
      handlers[name] = args[args.length - 1] as PromptCallback;
    },
  };
  return { handlers, server };
}

describe("build_a_course prompt", () => {
  test("registers build_a_course", () => {
    const { handlers, server } = capturePrompts();
    registerCoursePrompts(server as never);
    expect(Object.keys(handlers)).toEqual(["build_a_course"]);
  });

  test("returns non-empty guidance mentioning the key tools and syntax rules", () => {
    const { handlers, server } = capturePrompts();
    registerCoursePrompts(server as never);
    const result = handlers.build_a_course({});
    const text = result.messages[0].content.text;
    expect(text.length).toBeGreaterThan(200);
    expect(text).toMatch(/create_course/);
    expect(text).toMatch(/create_deck/);
    expect(text).toMatch(/get_course/);
    expect(text).toMatch(/import_subject/);
    expect(text).toMatch(/@read/);
    expect(text).toMatch(/hypothesis/i);
    // Depth ladders aren't implemented -- the prompt must warn against the
    // tag syntax, not instruct the AI to use it.
    expect(text).toMatch(/do not use.*@concept/i);
  });

  test("folds a given goal into the returned message", () => {
    const { handlers, server } = capturePrompts();
    registerCoursePrompts(server as never);
    const result = handlers.build_a_course({ goal: "learn Rust" });
    expect(result.messages[0].content.text).toMatch(/learn Rust/);
  });
});
