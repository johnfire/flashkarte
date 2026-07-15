import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./keys.service";

export const create = wrapAsync(async (req: Request, res: Response) => {
  const key = await service.createKey(
    req.userId!,
    req.body.name,
    req.body.scope,
  );
  await auditFromRequest(req, "key.created", "key", undefined, "success", undefined, {
    name: key.name,
    keyPrefix: key.key_prefix,
    scope: req.body.scope ?? "full",
  });
  res.status(201).json(key);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.listKeys(req.userId!));
});

export const revoke = wrapAsync(async (req: Request, res: Response) => {
  await service.revokeKey(req.userId!, req.params.prefix);
  await auditFromRequest(
    req,
    "key.revoked",
    "key",
    undefined,
    "success",
    {
      keyPrefix: req.params.prefix,
    },
  );
  res.status(204).end();
});
