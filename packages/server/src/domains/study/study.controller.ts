import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { actorFromRequest } from "../audit/audit.service";
import * as service from "./study.service";
import * as lessonReads from "./lesson-reads.service";
import { auditFromRequest } from "../audit/audit.service";

export const studyBatch = wrapAsync(async (req: Request, res: Response) => {
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? "20"), 10) || 20, 1),
    100,
  );
  // Clients that understand reading cards ask for them with ?lessons=1; older
  // ones never do, so they never receive a card they would show as a flip card.
  const includeLessons = req.query.lessons === "1";
  res.json(
    await service.getStudyBatch(
      req.userId!,
      req.params.id,
      limit,
      includeLessons,
    ),
  );
});

export const stats = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.stats(req.userId!, req.params.id));
});

export const review = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await service.review(
      req.userId!,
      req.body.card_id,
      req.body.rating,
      actorFromRequest(req),
      req.body.option_index,
    ),
  );
});

export const sync = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await service.sync(req.userId!, req.body.events, actorFromRequest(req)),
  );
});

export const readLessons = wrapAsync(async (req: Request, res: Response) => {
  const result = await lessonReads.recordLessonReads(
    req.userId!,
    req.body.reads,
  );
  if (result.recorded > 0) {
    await auditFromRequest(
      req,
      "lesson.read",
      "card",
      result.recorded === 1 ? result.acked_card_ids[0] : undefined,
      "success",
      undefined,
      { recorded: result.recorded },
    );
  }
  res.json(result);
});
