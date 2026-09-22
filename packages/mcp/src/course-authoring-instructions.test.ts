import { COURSE_AUTHORING_INSTRUCTIONS } from "./course-authoring-instructions";

describe("course authoring initialization instructions", () => {
  test("names all content types and gives structured course guidance", () => {
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(
      /flashcard decks, flashcard deck collections, and structured learning courses/i,
    );
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(/get_course_authoring_guide/);
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(/owner review/i);
  });

  test("limits deck-collection tools to explicit collection requests", () => {
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(
      /explicitly requests a flashcard deck collection/i,
    );
    expect(COURSE_AUTHORING_INSTRUCTIONS).toMatch(
      /create_course creates a flashcard deck collection/i,
    );
  });
});
