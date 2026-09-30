import { Router } from "express";
import * as controller from "./shared-email.controller";

export const sharedEmailRouter = Router();

sharedEmailRouter.post("/recipients", controller.upsertRecipients);
sharedEmailRouter.post(
  "/recipients/deactivate",
  controller.deactivateRecipient,
);
sharedEmailRouter.post("/campaigns", controller.createCampaign);
sharedEmailRouter.post("/messages/transactional", controller.sendTransactional);
sharedEmailRouter.get("/campaigns/:id", controller.getCampaign);
