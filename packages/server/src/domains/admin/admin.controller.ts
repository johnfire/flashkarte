import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
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
  res.status(201).json({ user });
});

export const update = wrapAsync(async (req: Request, res: Response) => {
  const user = await service.setAccountType(
    req.params.id,
    req.body.accountType,
  );
  res.json({ user });
});

export const unpublishDeck = wrapAsync(async (req: Request, res: Response) => {
  await service.unpublishDeck(req.params.id);
  res.status(204).end();
});
