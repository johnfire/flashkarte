import { Router } from "express";
import * as ctrl from "./schools.controller";

// Mounted under /api/admin (requireAdmin). The admin runs all school,
// teacher and class onboarding by hand — see
// docs/plans/2026-10-07-accounts-schools-teachers-design.md.
export const schoolsAdminRouter = Router();
schoolsAdminRouter.get("/schools", ctrl.listSchools);
schoolsAdminRouter.post("/schools", ctrl.createSchool);
schoolsAdminRouter.put("/users/:id/organization", ctrl.setOrganization);
schoolsAdminRouter.post("/users/:id/verify-teacher", ctrl.verifyTeacher);
schoolsAdminRouter.get("/classes", ctrl.listClasses);
schoolsAdminRouter.post("/classes", ctrl.createClass);
schoolsAdminRouter.get("/classes/:id", ctrl.getClass);
schoolsAdminRouter.delete("/classes/:id", ctrl.deleteClass);
schoolsAdminRouter.put("/classes/:id/members", ctrl.setClassMembers);
