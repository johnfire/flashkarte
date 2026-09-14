import { Router } from "express";
import * as ctrl from "./categories.controller";

/** Read-only browse tree, mounted at /api/categories for any authenticated user. */
export const categoriesRouter = Router();
categoriesRouter.get("/", ctrl.tree);

/** Admin CRUD, mounted at /api/admin/categories (already gated by requireAdmin). */
export const categoriesAdminRouter = Router();
categoriesAdminRouter.get("/", ctrl.tree);
categoriesAdminRouter.post("/", ctrl.create);
categoriesAdminRouter.patch("/:id", ctrl.update);
categoriesAdminRouter.delete("/:id", ctrl.remove);
