import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
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
