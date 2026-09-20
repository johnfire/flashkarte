/** MCP initialization guidance that disambiguates Flashkarte's two course models. */
export const COURSE_AUTHORING_INSTRUCTIONS =
  "For a course, default to the structured lesson engine: read " +
  "get_course_authoring_guide, then agree scope and have the owner review the " +
  "concept graph and syllabus before authoring lessons. Use subjects, modules, " +
  "lessons, screens, and questions. Use legacy deck-course tools only when the " +
  "user explicitly requests flashcards, decks, or a legacy deck course. " +
  "create_course creates a legacy deck course, not a structured lesson course.";
