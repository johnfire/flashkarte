import { Router } from "express";
import multer from "multer";
import * as ctrl from "./decks.controller";
import * as study from "../study/study.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const decksRouter = Router();
decksRouter.get("/", ctrl.list);
decksRouter.post("/", upload.single("file"), ctrl.create);
decksRouter.get("/:id", ctrl.get);
decksRouter.patch("/:id", ctrl.rename);
decksRouter.delete("/:id", ctrl.remove);

// Deck-scoped study + stats
decksRouter.get("/:id/study", study.studyBatch);
decksRouter.get("/:id/stats", study.stats);
