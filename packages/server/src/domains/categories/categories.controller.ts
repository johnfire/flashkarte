import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./categories.service";
import { contentLanguageFilterSchema } from "../library/content-language";
import { parse } from "../../utils/validate";

export const tree = wrapAsync(async (req: Request, res: Response) => {
  const language = parse(contentLanguageFilterSchema, req.query.language);
  res.json({ categories: await service.getTree(language) });
});

export const create = wrapAsync(async (req: Request, res: Response) => {
  const category = await service.create(req.body?.title, req.body?.parentId);
  await auditFromRequest(
    req,
    "admin.category_created",
    "deck_category",
    category.id,
    "success",
    undefined,
    { title: category.title, parentId: category.parentId },
  );
  res.status(201).json({ category });
});

export const update = wrapAsync(async (req: Request, res: Response) => {
  const category = await service.update(
    req.params.id,
    req.body?.title,
    req.body?.parentId,
  );
  await auditFromRequest(
    req,
    "admin.category_updated",
    "deck_category",
    category.id,
    "success",
    undefined,
    { title: category.title, parentId: category.parentId },
  );
  res.json({ category });
});

export const remove = wrapAsync(async (req: Request, res: Response) => {
  await service.remove(req.params.id);
  await auditFromRequest(
    req,
    "admin.category_deleted",
    "deck_category",
    req.params.id,
    "success",
  );
  res.status(204).end();
});
