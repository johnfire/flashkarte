import { z } from "zod";
import { parse } from "../../utils/validate";
import { ValidationError } from "../../utils/errors";
import { withUnitCreation } from "../billing/billing.service";
import { contentLanguageSchema } from "../library/content-language";
import * as coursesRepository from "../courses/courses.repository";
import * as decksRepository from "../decks/decks.repository";
import { MAX_CARDS_PER_DECK } from "../decks/decks.service";
import { validateBranching } from "../decks/branching";
import { validateReadingCards } from "../decks/reading-cards";
import { validateSenses } from "../decks/senses";
import {
  parseCourseWorkbook,
  parseCourseZip,
  parseDeckCsv,
  type ImportedDeck,
} from "./flashcard-import-parser";

const titleSchema = z
  .string({ error: "Title is required" })
  .trim()
  .min(1, "Title is required")
  .max(200, "Title is too long");

function contentLanguage(languageInput: unknown): "en" | "de" | "ar" | null {
  return languageInput === undefined
    ? null
    : parse(contentLanguageSchema, languageInput);
}

function importedTitle(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replaceAll("_", " ");
}

function validateImportedDeck(deck: ImportedDeck): void {
  if (deck.cards.length > MAX_CARDS_PER_DECK) {
    throw new ValidationError(
      `A deck can have at most ${MAX_CARDS_PER_DECK} cards`,
    );
  }
  validateBranching(deck.cards);
  validateReadingCards(deck.cards);
  validateSenses(deck.cards);
}

export async function importDeckCsv(
  userId: string,
  file: Express.Multer.File,
  titleInput: unknown,
  languageInput: unknown,
) {
  const title =
    titleInput === undefined || titleInput === ""
      ? importedTitle(file.originalname)
      : parse(titleSchema, titleInput);
  const deck = parseDeckCsv(file.buffer, title);
  validateImportedDeck(deck);
  const content = contentLanguage(languageInput);
  const createdDeck = await withUnitCreation(userId, (db) =>
    decksRepository.createDeckWithCards(
      userId,
      deck.title,
      file.originalname,
      deck.cards,
      content,
      db,
    ),
  );
  if (!createdDeck) throw new Error("Failed to import deck");
  return { ...createdDeck, card_count: deck.cards.length };
}

function isZipFile(file: Express.Multer.File): boolean {
  return file.originalname.toLowerCase().endsWith(".zip");
}

function readImportedCourse(file: Express.Multer.File) {
  return isZipFile(file)
    ? parseCourseZip(file.buffer)
    : parseCourseWorkbook(file.buffer);
}

async function createImportedCourse(
  userId: string,
  sourceFilename: string,
  course: Awaited<ReturnType<typeof readImportedCourse>>,
  content: "en" | "de" | "ar" | null,
) {
  return withUnitCreation(userId, async (db) => {
    const createdCourse = await coursesRepository.createCourse(
      userId,
      course.title,
      course.description,
      content,
      db,
    );
    if (!createdCourse) throw new Error("Failed to import course");
    for (const deck of course.decks) {
      const createdDeck = await decksRepository.createDeckWithCards(
        userId,
        deck.title,
        sourceFilename,
        deck.cards,
        content,
        db,
      );
      if (!createdDeck) throw new Error("Failed to import a course deck");
      await coursesRepository.addDeckToCourse(
        createdCourse.id,
        createdDeck.id,
        db,
      );
    }
    return createdCourse;
  });
}

export async function importFlashcardCourse(
  userId: string,
  file: Express.Multer.File,
  languageInput: unknown,
) {
  const importedCourse = await readImportedCourse(file);
  const content = contentLanguage(languageInput);
  for (const deck of importedCourse.decks) validateImportedDeck(deck);
  const course = await createImportedCourse(
    userId,
    file.originalname,
    importedCourse,
    content,
  );
  return { course, decks_imported: importedCourse.decks.length };
}
