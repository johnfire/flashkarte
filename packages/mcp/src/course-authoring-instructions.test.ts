import { COURSE_AUTHORING_INSTRUCTIONS } from "./course-authoring-instructions";

describe("course authoring initialization instructions", () => {
  test("defaults course requests to the structured lesson engine", () => {
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(
      /default to the structured lesson engine/i,
    );
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(/get_course_authoring_guide/);
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(/owner review/i);
  });

  test("limits legacy deck tools to explicit flashcard requests", () => {
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(
      /explicitly requests flashcards/i,
    );
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(
      /create_course creates a legacy deck course/i,
    );
  });
});
