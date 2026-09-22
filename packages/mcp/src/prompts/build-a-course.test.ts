import { registerCoursePrompts } from "./build-a-course";

type PromptCallback = (args: Record<string, unknown>) => {
  messages: { role: string; content: { type: string; text: string } }[];
};

function capturePrompts(): {
  handlers: Record<string, PromptCallback>;
  descriptions: Record<string, string>;
  server: { prompt: (...args: unknown[]) => void };
} {
  const handlers: Record<string, PromptCallback> = {};
  const descriptions: Record<string, string> = {};
  const server = {
    prompt: (...args: unknown[]) => {
      const name = args[0] as string;
      descriptions[name] = args[1] as string;
      handlers[name] = args[args.length - 1] as PromptCallback;
    },
  };
  return { handlers, descriptions, server };
}

describe("course prompts", () => {
  test("registers one prompt for each explicit course model", () => {
    const { handlers, descriptions, server } = capturePrompts();
    registerCoursePrompts(server as never);

    expect(Object.keys(handlers)).toEqual([
      "build_a_course",
      "build_flashcard_course",
      "build_lesson_course",
    ]);
    expect(descriptions.build_a_course).toMatch(/deprecated/i);
    expect(descriptions.build_flashcard_course).toMatch(/deck collection/i);
    expect(descriptions.build_lesson_course).toMatch(
      /structured learning course/i,
    );
  });

  test("keeps the deprecated prompt as a flashcard-course compatibility alias", () => {
    const { handlers, server } = capturePrompts();
    registerCoursePrompts(server as never);

    const alias = handlers.build_a_course({}).messages[0].content.text;
    const flashcard = handlers.build_flashcard_course({}).messages[0].content
      .text;

    expect(alias).toBe(flashcard);
    expect(alias).toMatch(/flashcard deck collection/i);
    expect(alias).toMatch(/create_course/);
    expect(alias).toMatch(/create_deck/);
    expect(alias).toMatch(/build_lesson_course/);
  });

  test("keeps structured lessons separate from legacy deck tools", () => {
    const { handlers, server } = capturePrompts();
    registerCoursePrompts(server as never);

    const lesson = handlers.build_lesson_course({}).messages[0].content.text;

    expect(lesson).toMatch(/get_course_authoring_guide/);
    expect(lesson).toMatch(/import_subject/);
    expect(lesson).toMatch(/import_lesson/);
    expect(lesson).toMatch(/review every prerequisite edge/i);
    expect(lesson).not.toMatch(/create_course/);
    expect(lesson).not.toMatch(/create_deck/);
  });

  test("adds a supplied goal to the selected prompt", () => {
    const { handlers, server } = capturePrompts();
    registerCoursePrompts(server as never);

    const lesson = handlers.build_lesson_course({ goal: "learn Rust" });
    expect(lesson.messages[0].content.text).toMatch(/learn Rust/);
  });
});
