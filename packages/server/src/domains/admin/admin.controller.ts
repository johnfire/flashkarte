import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./admin.service";

export const list = wrapAsync(async (_req: Request, res: Response) => {
  res.json({ users: await service.listUsers() });
});

export const create = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.createUser(
    req.body.email,
    req.body.password,
    req.body.accountType,
  );
  await auditFromRequest(
    req,
    "admin.user_created",
    "user",
    user.id,
    "success",
    undefined,
    {
      email: user.email,
      accountType: user.accountType,
    },
  );
  res.status(201).json({ user });
});

export const update = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.setAccountType(
    req.params.id,
    req.body.accountType,
  );
  await auditFromRequest(
    req,
    "admin.account_type_changed",
    "user",
    req.params.id,
    "success",
    undefined,
    {
      newAccountType: user.accountType,
    },
  );
  res.json({ user });
});

export const unpublishDeck = wrapAsync(async (req: Request, res: Response) => {
  await service.unpublishDeck(req.params.id);
  await auditFromRequest(
    req,
    "admin.deck_unpublished",
    "deck",
    req.params.id,
    "success",
  );
  res.status(204).end();
});

export const promoteOfficialDeck = wrapAsync(
  async (req: Request, res: Response) => {
    await service.promoteOfficialDeck(req.params.id, req.body?.collectionTitle);
    await auditFromRequest(
      req,
      "admin.deck_promoted_official",
      "deck",
      req.params.id,
      "success",
      undefined,
      { collectionTitle: req.body?.collectionTitle ?? null },
    );
    res.status(204).end();
  },
);

export const setSubjectOfficial = wrapAsync(
  async (req: Request, res: Response) => {
    await service.setSubjectOfficial(
      req.params.id,
      Boolean(req.body?.official),
    );
    await auditFromRequest(
      req,
      "admin.subject_official_changed",
      "subject",
      req.params.id,
      "success",
    );
    res.status(204).end();
  },
);

export const demoteOfficialDeck = wrapAsync(
  async (req: Request, res: Response) => {
    await service.demoteOfficialDeck(req.params.id, req.body.ownerId);
    await auditFromRequest(
      req,
      "admin.deck_demoted_official",
      "deck",
      req.params.id,
      "success",
      undefined,
      { newOwnerId: req.body.ownerId },
    );
    res.status(204).end();
  },
);

export const setDeckCategory = wrapAsync(
  async (req: Request, res: Response) => {
    await service.setDeckCategory(req.params.id, req.body?.categoryId);
    await auditFromRequest(
      req,
      "admin.deck_category_changed",
      "deck",
      req.params.id,
      "success",
      undefined,
      { categoryId: req.body?.categoryId ?? null },
    );
    res.status(204).end();
  },
);

export const setCollectionCategory = wrapAsync(
  async (req: Request, res: Response) => {
    await service.setCollectionCategory(req.params.id, req.body?.categoryId);
    await auditFromRequest(
      req,
      "admin.collection_category_changed",
      "deck_collection",
      req.params.id,
      "success",
      undefined,
      { categoryId: req.body?.categoryId ?? null },
    );
    res.status(204).end();
  },
);
