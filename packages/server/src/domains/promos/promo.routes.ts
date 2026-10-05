import { Router } from "express";
import rateLimit from "express-rate-limit";
import { wrapAsync } from "../../utils/wrapAsync";
import { actorFromRequest } from "../audit/audit.service";
import * as service from "./promo.service";

export const promoAdminRouter = Router();
promoAdminRouter.get(
  "/",
  wrapAsync(async (_req, res) => {
    res.json({ promos: await service.listPromos() });
  }),
);
promoAdminRouter.post(
  "/",
  wrapAsync(async (req, res) => {
    res.status(201).json({
      promo: await service.createPromo(req.body, actorFromRequest(req)),
    });
  }),
);
promoAdminRouter.patch(
  "/:id",
  wrapAsync(async (req, res) => {
    res.json({
      promo: await service.setPromoActive(
        req.params.id,
        req.body.active,
        actorFromRequest(req),
      ),
    });
  }),
);

export const promoPreview = [
  rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === "test",
  }),
  wrapAsync(async (req, res) => {
    res.json(await service.previewPromo(req.body.code));
  }),
];
