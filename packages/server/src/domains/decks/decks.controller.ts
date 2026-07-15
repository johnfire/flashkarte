import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./decks.service";

export const create = wrapAsync(async (req: Request, res: Response) => {
  const markdown = req.file
    ? req.file.buffer.toString("utf8")
    : req.body.markdown;
  const filename = req.file ? req.file.originalname : (req.body.title ?? null);
  const deck = await service.importDeck(req.userId!, markdown, filename);
  await auditFromRequest(req, "deck.created", "deck", deck.id, "success", undefined, {
    title: deck.title,
    cardCount: deck.card_count,
  });
  res.status(201).json(deck);
});

export const addCards = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.appendCards(
    req.userId!,
    req.params.id,
    req.body.markdown,
  );
  await auditFromRequest(req, "deck.cards_added", "deck", result.deck_id, "success", undefined, {
    added: result.added,
  });
  res.status(201).json(result);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.list(req.userId!));
});

export const get = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.get(req.userId!, req.params.id));
});

export const update = wrapAsync(async (req: Request, res: Response) => {
  const updated = await service.update(req.userId!, req.params.id, {
    title: req.body.title,
    isPublic: req.body.isPublic,
    isOrdered: req.body.isOrdered,
  });
  await auditFromRequest(
    req,
    "deck.updated",
    "deck",
    req.params.id,
    "success",
    undefined,
    {
      title: updated.title,
      isPublic: updated.is_public,
      isOrdered: updated.is_ordered,
    },
  );
  res.json(updated);
});

export const remove = wrapAsync(async (req: Request, res: Response) => {
  await service.remove(req.userId!, req.params.id);
  await auditFromRequest(
    req,
    "deck.deleted",
    "deck",
    req.params.id,
    "success",
  );
  res.status(204).end();
});
