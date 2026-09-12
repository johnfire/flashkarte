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
  await auditFromRequest(
    req,
    "deck.created",
    "deck",
    deck.id,
    "success",
    undefined,
    {
      title: deck.title,
      cardCount: deck.card_count,
    },
  );
  res.status(201).json(deck);
});

export const addCards = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.appendCards(
    req.userId!,
    req.params.id,
    req.body.markdown,
  );
  await auditFromRequest(
    req,
    "deck.cards_added",
    "deck",
    result.deck_id,
    "success",
    undefined,
    {
      added: result.added,
    },
  );
  res.status(201).json(result);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.list(req.userId!));
});

export const listOfficial = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.listStandaloneOfficial(req.userId!, req.query));
});

export const listCollections = wrapAsync(
  async (req: Request, res: Response) => {
    res.json(await service.listCollections(req.query));
  },
);

export const getCollection = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await service.getCollectionDecks(req.userId!, req.params.id, req.query),
  );
});

export const subscribeAll = wrapAsync(async (req: Request, res: Response) => {
  const count = await service.subscribeAll(req.userId!, req.params.id);
  await auditFromRequest(
    req,
    "deck.collection_subscribed_all",
    "deck_collection",
    req.params.id,
    "success",
    undefined,
    { count },
  );
  res.json({ subscribed: count });
});

export const subscribe = wrapAsync(async (req: Request, res: Response) => {
  await service.subscribe(req.userId!, req.params.id);
  await auditFromRequest(
    req,
    "deck.subscribed",
    "deck",
    req.params.id,
    "success",
  );
  res.status(204).end();
});

export const unsubscribe = wrapAsync(async (req: Request, res: Response) => {
  await service.unsubscribe(req.userId!, req.params.id);
  await auditFromRequest(
    req,
    "deck.unsubscribed",
    "deck",
    req.params.id,
    "success",
  );
  res.status(204).end();
});

export const get = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.get(req.userId!, req.params.id));
});

export const getSettings = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.getSettings(req.userId!, req.params.id));
});

export const update = wrapAsync(async (req: Request, res: Response) => {
  const updated = await service.update(req.userId!, req.params.id, {
    title: req.body.title,
    isPublic: req.body.isPublic,
    isOrdered: req.body.isOrdered,
    speechEnabled: req.body.speechEnabled,
    speechFrontLang: req.body.speechFrontLang,
    speechBackLang: req.body.speechBackLang,
    speechAutoplay: req.body.speechAutoplay,
    speechRate: req.body.speechRate,
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
      speechEnabled: updated.speech_enabled,
      speechFrontLang: updated.speech_front_lang,
      speechBackLang: updated.speech_back_lang,
      speechAutoplay: updated.speech_autoplay,
      speechRate: updated.speech_rate,
    },
  );
  res.json(updated);
});

export const remove = wrapAsync(async (req: Request, res: Response) => {
  await service.remove(req.userId!, req.params.id);
  await auditFromRequest(req, "deck.deleted", "deck", req.params.id, "success");
  res.status(204).end();
});
