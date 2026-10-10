import type { Request, Response } from "express";
import { ValidationError } from "../../utils/errors";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./content-imports.service";

function uploadedFile(req: Request): Express.Multer.File {
  if (!req.file) throw new ValidationError("Choose a file to import");
  return req.file;
}

function hasExtension(file: Express.Multer.File, extension: string): boolean {
  return file.originalname.toLowerCase().endsWith(extension);
}

export const deckCsv = wrapAsync(async (req: Request, res: Response) => {
  const file = uploadedFile(req);
  if (!hasExtension(file, ".csv")) {
    throw new ValidationError("Choose a CSV file for a flashcard deck");
  }
  const deck = await service.importDeckCsv(
    req.userId!,
    file,
    req.body.title,
    req.body.contentLanguage,
  );
  await auditFromRequest(
    req,
    "deck.csv_imported",
    "deck",
    deck.id,
    "success",
    undefined,
    {
      title: deck.title,
      cardCount: deck.card_count,
    },
  );
  res.status(201).json(deck);
});

export const flashcardCourse = wrapAsync(
  async (req: Request, res: Response) => {
    const file = uploadedFile(req);
    if (!hasExtension(file, ".xlsx") && !hasExtension(file, ".zip")) {
      throw new ValidationError(
        "Choose an .xlsx workbook or a ZIP of CSV files",
      );
    }
    const imported = await service.importFlashcardCourse(
      req.userId!,
      file,
      req.body.contentLanguage,
    );
    await auditFromRequest(
      req,
      "course.flashcard_imported",
      "course",
      imported.course.id,
      "success",
      undefined,
      { title: imported.course.title, decksImported: imported.decks_imported },
    );
    res.status(201).json(imported);
  },
);
