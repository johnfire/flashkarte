import { Router } from "express";
import * as controller from "./email.controller";

export const emailAdminRouter = Router();
emailAdminRouter.post("/contact", controller.contactUsers);
emailAdminRouter.get("/campaigns/:id", controller.getCampaignStatus);
