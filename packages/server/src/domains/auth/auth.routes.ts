import { Router } from "express";
import { requireAuth, requireFullScope } from "../../middleware/auth";
import * as ctrl from "./auth.controller";

export const authRouter = Router();
authRouter.post("/signup", ctrl.signup);
authRouter.post("/login", ctrl.login);
authRouter.post("/2fa/verify", ctrl.twoFactorLogin);
authRouter.post("/refresh", ctrl.refresh);
authRouter.post("/logout", ctrl.logout);
// Account-level routes below are for the person, not for an AI: a deck-scoped (AI authoring or MCP) key is
// refused, so it cannot read the profile or change account settings.
authRouter.get("/me", requireAuth, requireFullScope, ctrl.me);
authRouter.patch("/me", requireAuth, requireFullScope, ctrl.updateMe);
authRouter.post("/verify-email", ctrl.verifyEmail);
authRouter.post("/confirm-email-change", ctrl.confirmEmailChange);
authRouter.post(
  "/resend-verification",
  requireAuth,
  requireFullScope,
  ctrl.resendVerification,
);
authRouter.post(
  "/change-password",
  requireAuth,
  requireFullScope,
  ctrl.changePassword,
);
authRouter.post(
  "/change-email",
  requireAuth,
  requireFullScope,
  ctrl.requestEmailChange,
);
authRouter.post("/forgot-password", ctrl.forgotPassword);
authRouter.post("/reset-password", ctrl.resetPassword);
authRouter.delete(
  "/account",
  requireAuth,
  requireFullScope,
  ctrl.deleteAccount,
);
