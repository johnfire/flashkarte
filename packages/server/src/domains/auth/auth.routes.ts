import { Router } from "express";
import { requireAuth, requireFullScope } from "../../middleware/auth";
import * as ctrl from "./auth.controller";

export const authRouter = Router();
authRouter.post("/signup", ctrl.signup);
authRouter.post("/login", ctrl.login);
authRouter.post("/refresh", ctrl.refresh);
authRouter.post("/logout", ctrl.logout);
authRouter.get("/me", requireAuth, ctrl.me);
authRouter.patch("/me", requireAuth, ctrl.updateMe);
authRouter.post("/verify-email", ctrl.verifyEmail);
authRouter.post("/resend-verification", requireAuth, ctrl.resendVerification);
authRouter.post("/change-password", requireAuth, ctrl.changePassword);
authRouter.post("/forgot-password", ctrl.forgotPassword);
authRouter.post("/reset-password", ctrl.resetPassword);
authRouter.delete(
  "/account",
  requireAuth,
  requireFullScope,
  ctrl.deleteAccount,
);
