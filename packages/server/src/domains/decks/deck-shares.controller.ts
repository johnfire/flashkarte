import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./deck-shares.service";

export const listSharedWithMe = wrapAsync(
  async (req: Request, res: Response) => {
    res.json({ decks: await service.listSharedWithMe(req.userId!) });
  },
);

export const getShares = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.getShares(req.userId!, req.params.id));
});

export const setShares = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.setShares(req.userId!, req.params.id, req.body);
  await auditFromRequest(
    req,
    "deck.shares_changed",
    "deck",
    req.params.id,
    "success",
    undefined,
    { shares: result.shares },
  );
  res.json(result);
});
