import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./decks.service";

export const create = wrapAsync(async (req: Request, res: Response) => {
  const markdown = req.file
    ? req.file.buffer.toString("utf8")
    : req.body.markdown;
  const filename = req.file ? req.file.originalname : (req.body.title ?? null);
  const deck = await service.importDeck(req.userId!, markdown, filename);
  res.status(201).json(deck);
});

export const addCards = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.appendCards(
    req.userId!,
    req.params.id,
    req.body.markdown,
  );
  res.status(201).json(result);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.list(req.userId!));
});

export const get = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.get(req.userId!, req.params.id));
});

export const rename = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.rename(req.userId!, req.params.id, req.body.title));
});

export const remove = wrapAsync(async (req: Request, res: Response) => {
  await service.remove(req.userId!, req.params.id);
  res.status(204).end();
});
