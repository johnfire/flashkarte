import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./account.service";
import * as twoFactor from "./twoFactor.service";

export const exportData = wrapAsync(async (req: Request, res: Response) => {
  const data = await service.exportData(req.userId!);
  // A read, but security-relevant — someone pulling a full copy of an
  // account's data is worth an audit trail (§13.3).
  await auditFromRequest(req, "account.data_exported", "user", req.userId!);
  const date = data.exportedAt.slice(0, 10);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="flashkarte-export-${date}.json"`,
  );
  res.json(data);
});

export const twoFactorSetup = wrapAsync(async (req: Request, res: Response) => {
  const result = await twoFactor.setup(req.userId!);
  await auditFromRequest(req, "2fa.setup_started", "user", req.userId!);
  res.json(result);
});

export const twoFactorEnable = wrapAsync(
  async (req: Request, res: Response) => {
    const { backupCodes } = await twoFactor.enable(req.userId!, req.body.code);
    await auditFromRequest(req, "2fa.enabled", "user", req.userId!);
    res.json({ backupCodes });
  },
);

export const twoFactorDisable = wrapAsync(
  async (req: Request, res: Response) => {
    await twoFactor.disable(req.userId!, req.body.code);
    await auditFromRequest(req, "2fa.disabled", "user", req.userId!);
    res.status(204).end();
  },
);
