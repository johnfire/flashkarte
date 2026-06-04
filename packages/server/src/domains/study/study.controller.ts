import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import * as service from "./study.service";

export const studyBatch = wrapAsync(async (req: Request, res: Response) => {
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1),
    100,
  );
  res.json(await service.getStudyBatch(req.userId!, req.params.id, limit));
});

export const stats = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.stats(req.userId!, req.params.id));
});

export const review = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await service.review(req.userId!, req.body.card_id, req.body.rating),
  );
});
