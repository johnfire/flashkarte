import { Router } from "express";
import * as ctrl from "./account.controller";
import {
  listContentLanguagePreferences,
  saveContentLanguagePreference,
} from "./content-language-preferences.controller";

export const accountRouter = Router();
accountRouter.get("/content-languages", listContentLanguagePreferences);
accountRouter.put("/content-languages/:page", saveContentLanguagePreference);
accountRouter.get("/export", ctrl.exportData);
accountRouter.post("/2fa/setup", ctrl.twoFactorSetup);
accountRouter.post("/2fa/verify", ctrl.twoFactorEnable);
accountRouter.post("/2fa/disable", ctrl.twoFactorDisable);
