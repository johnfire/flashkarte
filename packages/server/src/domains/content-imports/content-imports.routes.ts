import { Router } from "express";
import multer from "multer";
import * as controller from "./content-imports.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export const contentImportsRouter = Router();
contentImportsRouter.post(
  "/deck-csv",
  upload.single("file"),
  controller.deckCsv,
);
contentImportsRouter.post(
  "/flashcard-course",
  upload.single("file"),
  controller.flashcardCourse,
);
