import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./course-collections.service";

function sourceIsOfficial(source: unknown): boolean {
  return source === "official";
}

export const listCatalog = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await service.listCatalogCollections(
      sourceIsOfficial(req.query.source),
      req.query.language,
    ),
  );
});

export const getCatalog = wrapAsync(async (req: Request, res: Response) => {
  res.json(
    await service.getCatalogCollection(
      req.params.id,
      sourceIsOfficial(req.query.source),
      req.query.language,
    ),
  );
});

export const enrollAll = wrapAsync(async (req: Request, res: Response) => {
  const isOfficial = sourceIsOfficial(req.query.source);
  const enrolled = await service.enrollInCatalogCollection(
    req.userId!,
    req.params.id,
    isOfficial,
  );
  await auditFromRequest(
    req,
    "course_collection.enrolled",
    "course_collection",
    req.params.id,
    "success",
    undefined,
    { source: isOfficial ? "official" : "community", enrolled },
  );
  res.json({ enrolled });
});
