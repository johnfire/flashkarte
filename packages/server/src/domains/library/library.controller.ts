import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { NotFoundError } from "../../utils/errors";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./library.service";

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json({ decks: await service.list(req.query.q) });
});

export const get = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.get(req.params.id));
});

export const preview = wrapAsync(async (req: Request, res: Response) => {
  const p = await service.getPreview(req.params.id);
  if (!p) throw new NotFoundError("Deck not found");
  res.json(p);
});

export const clone = wrapAsync(async (req: Request, res: Response) => {
  const { deck, sourceId } = await service.clone(req.userId!, req.params.id);
  await auditFromRequest(req, "deck.cloned", "deck", deck.id, "success", undefined, {
    originalDeckId: sourceId,
    title: deck.title,
  });
  res.status(201).json(deck);
});
