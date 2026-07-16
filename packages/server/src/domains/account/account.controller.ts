import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./account.service";

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
