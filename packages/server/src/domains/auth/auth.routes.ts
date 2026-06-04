import { Router } from "express";
import * as ctrl from "./auth.controller";

export const authRouter = Router();
authRouter.post("/signup", ctrl.signup);
authRouter.post("/login", ctrl.login);
authRouter.post("/refresh", ctrl.refresh);
authRouter.post("/logout", ctrl.logout);
