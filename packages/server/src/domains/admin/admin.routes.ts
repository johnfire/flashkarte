import { Router } from "express";
import * as ctrl from "./admin.controller";
import { categoriesAdminRouter } from "../categories/categories.routes";
import { emailAdminRouter } from "../email/email.routes";

export const adminRouter = Router();
adminRouter.get("/users", ctrl.list);
adminRouter.post("/users", ctrl.create);
adminRouter.patch("/users/:id", ctrl.update);
adminRouter.post("/decks/:id/unpublish", ctrl.unpublishDeck);
adminRouter.post("/decks/:id/promote-official", ctrl.promoteOfficialDeck);
adminRouter.patch("/subjects/:id/official", ctrl.setSubjectOfficial);
adminRouter.post("/course-collections", ctrl.createCourseCollection);
adminRouter.patch(
  "/subjects/:id/course-collection",
  ctrl.setSubjectCourseCollection,
);
adminRouter.put(
  "/course-collections/:id/subjects",
  ctrl.setCourseCollectionMembers,
);
adminRouter.post("/decks/:id/demote-official", ctrl.demoteOfficialDeck);
adminRouter.patch("/decks/:id/category", ctrl.setDeckCategory);
adminRouter.patch("/collections/:id/category", ctrl.setCollectionCategory);
adminRouter.patch("/decks/:id/content-language", ctrl.setDeckContentLanguage);
adminRouter.patch(
  "/collections/:id/content-language",
  ctrl.setCollectionContentLanguage,
);
adminRouter.use("/categories", categoriesAdminRouter);
adminRouter.use("/email", emailAdminRouter);
