import { Router } from "express";
import * as controller from "./billing.controller";

// Checkout is available after authentication but before email verification so
// a new user can choose a paid plan during registration. Other billing
// operations remain behind the normal verified-account gate.
export const preVerificationBillingRouter = Router();
preVerificationBillingRouter.post(
  "/stripe/checkout",
  controller.stripeCheckout,
);

export const billingRouter = Router();
billingRouter.get("/status", controller.status);
billingRouter.get("/units", controller.units);
billingRouter.patch("/units/:unitType/:unitId", controller.setUnitActive);
billingRouter.post("/stripe/portal", controller.stripePortal);
billingRouter.post("/google-play/purchases", controller.googlePlayPurchase);
