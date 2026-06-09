import { Router } from "express";
import * as ctrl from "./library.controller";

// Unauthenticated public read API: deck list + answer-free previews. Mounted
// before the requireAuth gate. No clone here (cloning requires a logged-in user).
export const publicLibraryRouter = Router();
publicLibraryRouter.get("/", ctrl.list);
publicLibraryRouter.get("/:id/preview", ctrl.preview);
