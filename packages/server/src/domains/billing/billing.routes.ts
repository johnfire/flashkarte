import { Router } from "express";
import * as controller from "./billing.controller";

export const billingRouter = Router();
billingRouter.get("/status", controller.status);
billingRouter.get("/units", controller.units);
billingRouter.patch("/units/:unitType/:unitId", controller.setUnitActive);
billingRouter.post("/stripe/checkout", controller.stripeCheckout);
billingRouter.post("/stripe/portal", controller.stripePortal);
billingRouter.post("/google-play/purchases", controller.googlePlayPurchase);
