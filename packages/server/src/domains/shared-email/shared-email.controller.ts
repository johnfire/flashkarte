import type { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { sharedEmailTenantFromRequest } from "./shared-email.auth";
import * as service from "./shared-email.service";

export const upsertRecipients = wrapAsync(
  async (req: Request, res: Response) => {
    const result = await service.upsertRecipients(
      sharedEmailTenantFromRequest(req),
      req.body?.recipients,
    );
    res.status(202).json(result);
  },
);

export const deactivateRecipient = wrapAsync(
  async (req: Request, res: Response) => {
    await service.deactivateRecipient(
      sharedEmailTenantFromRequest(req),
      req.body,
    );
    res.status(204).end();
  },
);

export const createCampaign = wrapAsync(async (req: Request, res: Response) => {
  const campaign = await service.createCampaign(
    sharedEmailTenantFromRequest(req),
    req.body,
  );
  res.status(202).json({ campaign });
});

export const sendTransactional = wrapAsync(
  async (req: Request, res: Response) => {
    const campaign = await service.sendTransactional(
      sharedEmailTenantFromRequest(req),
      req.body,
    );
    res.status(202).json({ campaign });
  },
);

export const getCampaign = wrapAsync(async (req: Request, res: Response) => {
  const campaign = await service.getCampaign(
    sharedEmailTenantFromRequest(req),
    req.params.id,
  );
  res.json({ campaign });
});
