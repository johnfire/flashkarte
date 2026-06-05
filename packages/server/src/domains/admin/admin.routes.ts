import { Router } from "express";
import * as ctrl from "./admin.controller";

export const adminRouter = Router();
adminRouter.get("/users", ctrl.list);
adminRouter.post("/users", ctrl.create);
adminRouter.patch("/users/:id", ctrl.update);
adminRouter.post("/decks/:id/unpublish", ctrl.unpublishDeck);
