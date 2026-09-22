/** MCP initialization guidance that distinguishes Flashkarte's three content types. */
export const COURSE_AUTHORING_INSTRUCTIONS =
  "Flashkarte has three content types: flashcard decks, flashcard deck " +
  "collections, and structured learning courses. For a request to create a " +
  "course, ask which type the owner means if it is not clear. A structured " +
  "learning course is for lessons, a curriculum, or a guided course: read " +
  "get_course_authoring_guide, then agree scope and have the owner review the " +
  "concept graph and syllabus before authoring lessons. Use subjects, modules, " +
  "lessons, screens, and questions. Use create_deck for a flashcard deck. Use " +
  "the legacy-named deck-collection tools only when the owner explicitly " +
  "requests a flashcard deck collection or a gated sequence of decks. " +
  "create_course creates a flashcard deck collection, not a structured learning course.";
