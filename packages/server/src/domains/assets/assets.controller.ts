import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as assets from "./assets.service";

/** A write made with an AI (deck-scoped) key is recorded as AI-authored, never as the person. */
const authorKindOf = (req: Request) =>
  req.keyScope === "deck" ? "ai" : "human";

const audit = (req: Request, action: string, detail: object) =>
  auditFromRequest(
    req,
    action,
    "subject",
    req.params.id,
    "success",
    undefined,
    detail,
  );

export const create = wrapAsync(async (req: Request, res: Response) => {
  const asset = await assets.createAsset(
    req.userId!,
    req.params.id,
    req.body,
    authorKindOf(req),
  );
  await audit(req, "asset.created", {
    asset: asset.id,
    removed: asset.removed.length,
  });
  res.status(201).json(asset);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await assets.listAssets(req.userId!, req.params.id));
});

/**
 * The image itself. It is served as a plain image with a policy that lets nothing run or load,
 * so even opened directly in a tab it is only a picture. An asset's id never changes what it
 * contains, so a client may keep it.
 */
export const serve = wrapAsync(async (req: Request, res: Response) => {
  const svg = await assets.getAssetSvg(
    req.userId!,
    req.params.id,
    req.params.assetId,
  );
  res
    .status(200)
    .type("image/svg+xml; charset=utf-8")
    .set({
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=31536000, immutable",
    })
    .send(svg);
});

export const remove = wrapAsync(async (req: Request, res: Response) => {
  const result = await assets.deleteAsset(
    req.userId!,
    req.params.id,
    req.params.assetId,
  );
  await audit(req, "asset.deleted", { asset: result.id });
  res.status(204).end();
});
