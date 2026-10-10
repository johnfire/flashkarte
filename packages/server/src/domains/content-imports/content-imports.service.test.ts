jest.mock("../billing/billing.service", () => ({
  withUnitCreation: jest.fn((_userId, work) => work({ transaction: "db" })),
}));
jest.mock("../courses/courses.repository");
jest.mock("../decks/decks.repository");
jest.mock("../decks/branching");
jest.mock("../decks/reading-cards");
jest.mock("../decks/senses");
jest.mock("./flashcard-import-parser");

import * as billing from "../billing/billing.service";
import * as coursesRepository from "../courses/courses.repository";
import * as decksRepository from "../decks/decks.repository";
import * as parser from "./flashcard-import-parser";
import { importFlashcardCourse } from "./content-imports.service";

const mockedBilling = billing as jest.Mocked<typeof billing>;
const mockedCoursesRepository = coursesRepository as jest.Mocked<
  typeof coursesRepository
>;
const mockedDecksRepository = decksRepository as jest.Mocked<
  typeof decksRepository
>;
const mockedParser = parser as jest.Mocked<typeof parser>;

const importedCourse = {
  title: "French A1",
  description: "Essential French",
  decks: [
    {
      title: "Greetings",
      cards: [
        {
          type: "basic" as const,
          front: "Bonjour",
          back: "Hello",
          category: null,
          label: null,
          options: [],
          sense: null,
          senseConflict: false,
        },
      ],
    },
    {
      title: "At the cafe",
      cards: [
        {
          type: "basic" as const,
          front: "L'addition",
          back: "The bill",
          category: null,
          label: null,
          options: [],
          sense: null,
          senseConflict: false,
        },
      ],
    },
  ],
};

function courseUpload(filename: string): Express.Multer.File {
  return {
    originalname: filename,
    buffer: Buffer.from("content"),
  } as Express.Multer.File;
}

describe("importFlashcardCourse", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedParser.parseCourseWorkbook.mockResolvedValue(importedCourse);
    mockedCoursesRepository.createCourse.mockResolvedValue({
      id: "c1",
    } as never);
    mockedDecksRepository.createDeckWithCards
      .mockResolvedValueOnce({ id: "d1" } as never)
      .mockResolvedValueOnce({ id: "d2" } as never);
  });

  test("creates the course, its decks and their ordering in one billing transaction", async () => {
    const imported = await importFlashcardCourse(
      "u1",
      courseUpload("french.xlsx"),
      "en",
    );

    expect(imported).toEqual({ course: { id: "c1" }, decks_imported: 2 });
    expect(mockedBilling.withUnitCreation).toHaveBeenCalledWith(
      "u1",
      expect.any(Function),
    );
    expect(mockedCoursesRepository.createCourse).toHaveBeenCalledWith(
      "u1",
      "French A1",
      "Essential French",
      "en",
      { transaction: "db" },
    );
    expect(mockedDecksRepository.createDeckWithCards).toHaveBeenNthCalledWith(
      1,
      "u1",
      "Greetings",
      "french.xlsx",
      importedCourse.decks[0].cards,
      "en",
      { transaction: "db" },
    );
    expect(mockedCoursesRepository.addDeckToCourse).toHaveBeenNthCalledWith(
      2,
      "c1",
      "d2",
      { transaction: "db" },
    );
  });
});
