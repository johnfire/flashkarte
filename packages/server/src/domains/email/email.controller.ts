import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./email.service";

export const contactUsers = wrapAsync(async (req: Request, res: Response) => {
  const campaign = await service.contactUsers(
    req.userId as string,
    req.body?.subject,
    req.body?.textBody,
    req.body?.recipientIds,
  );
  await auditFromRequest(
    req,
    "admin.email_campaign_queued",
    "email_campaign",
    campaign.id,
    "success",
    undefined,
    {
      category: "service_announcement",
      recipientCount: campaign.recipientCount,
      subjectLength: req.body?.subject?.length ?? 0,
    },
  );
  res.status(202).json({ campaign });
});

export const getCampaignStatus = wrapAsync(
  async (req: Request, res: Response) => {
    res.json({ campaign: await service.getCampaignStatus(req.params.id) });
  },
);
