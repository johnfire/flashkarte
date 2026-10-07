import { Router } from "express";
import * as ctrl from "./courses.controller";
import { requireFullScope } from "../../middleware/auth";

export const coursesRouter = Router();
coursesRouter.get("/", ctrl.list);
// Must come before "/:id" or "shared" would be parsed as a course id.
coursesRouter.get("/shared", ctrl.listShared);
coursesRouter.post("/", ctrl.create);
coursesRouter.get("/:id", ctrl.get);
coursesRouter.patch("/:id", ctrl.update);
coursesRouter.delete("/:id", ctrl.remove);
coursesRouter.post("/:id/decks", ctrl.addDeck);
coursesRouter.patch("/:id/decks/reorder", ctrl.reorderDecks);
coursesRouter.delete("/:id/decks/:deckId", ctrl.removeDeck);
coursesRouter.post("/:id/subscribe", ctrl.subscribe);
coursesRouter.delete("/:id/subscribe", ctrl.unsubscribe);
// Who a course reaches is an account decision: deck-scoped (MCP) keys may
// not change it.
coursesRouter.get("/:id/shares", requireFullScope, ctrl.getShares);
coursesRouter.put("/:id/shares", requireFullScope, ctrl.setShares);
