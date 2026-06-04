import { Router } from "express";
import * as ctrl from "./keys.controller";

export const keysRouter = Router();
keysRouter.post("/", ctrl.create);
keysRouter.get("/", ctrl.list);
keysRouter.delete("/:prefix", ctrl.revoke);
