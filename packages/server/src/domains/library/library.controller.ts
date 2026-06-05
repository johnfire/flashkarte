import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./library.service";

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json({ decks: await service.list(req.query.q) });
});

export const get = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.get(req.params.id));
});

export const clone = wrapAsync(async (req: Request, res: Response) => {
  const deck = await service.clone(req.userId!, req.params.id);
  res.status(201).json(deck);
});
