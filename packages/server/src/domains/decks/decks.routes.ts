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
// Must come before "/:id" or "official"/"collections" would be parsed as a deck id.
decksRouter.get("/official/collections", ctrl.listCollections);
decksRouter.get("/official/collections/:id", ctrl.getCollection);
decksRouter.post("/official/collections/:id/subscribe-all", ctrl.subscribeAll);
decksRouter.get("/official", ctrl.listOfficial);
decksRouter.post("/", upload.single("file"), ctrl.create);
decksRouter.get("/:id", ctrl.get);
decksRouter.get("/:id/settings", ctrl.getSettings);
decksRouter.patch("/:id", ctrl.update);
decksRouter.delete("/:id", ctrl.remove);
decksRouter.post("/:id/cards", ctrl.addCards);
decksRouter.post("/:id/subscribe", ctrl.subscribe);
decksRouter.delete("/:id/subscribe", ctrl.unsubscribe);

// Deck-scoped study + stats
decksRouter.get("/:id/study", study.studyBatch);
decksRouter.get("/:id/stats", study.stats);
