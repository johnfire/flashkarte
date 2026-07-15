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
