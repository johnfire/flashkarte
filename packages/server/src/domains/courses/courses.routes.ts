import { Router } from "express";
import * as ctrl from "./courses.controller";

export const coursesRouter = Router();
coursesRouter.get("/", ctrl.list);
coursesRouter.post("/", ctrl.create);
coursesRouter.get("/:id", ctrl.get);
coursesRouter.patch("/:id", ctrl.update);
coursesRouter.delete("/:id", ctrl.remove);
coursesRouter.post("/:id/decks", ctrl.addDeck);
coursesRouter.patch("/:id/decks/reorder", ctrl.reorderDecks);
coursesRouter.delete("/:id/decks/:deckId", ctrl.removeDeck);
