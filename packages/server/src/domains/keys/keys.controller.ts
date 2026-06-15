import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./keys.service";

export const create = wrapAsync(async (req: Request, res: Response) => {
  const key = await service.createKey(
    req.userId!,
    req.body.name,
    req.body.scope,
  );
  res.status(201).json(key);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.listKeys(req.userId!));
});

export const revoke = wrapAsync(async (req: Request, res: Response) => {
  await service.revokeKey(req.userId!, req.params.prefix);
  res.status(204).end();
});
