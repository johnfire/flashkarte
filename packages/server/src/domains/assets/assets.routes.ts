import { Router } from "express";
import * as ctrl from "./assets.controller";

/** Mounted at /api/subjects. Readable and writable with an AI key, like the lesson authoring routes. */
export const assetsRouter = Router();

assetsRouter.post("/:id/assets", ctrl.create);
assetsRouter.get("/:id/assets", ctrl.list);
assetsRouter.get("/:id/assets/:assetId", ctrl.serve);
assetsRouter.delete("/:id/assets/:assetId", ctrl.remove);
