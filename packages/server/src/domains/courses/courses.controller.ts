import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./courses.service";

export const create = wrapAsync(async (req: Request, res: Response) => {
  const course = await service.createCourse(
    req.userId!,
    req.body.title,
    req.body.description,
  );
  await auditFromRequest(
    req,
    "course.created",
    "course",
    course.id,
    "success",
    undefined,
    { title: course.title },
  );
  res.status(201).json(course);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.listCourses(req.userId!));
});

export const get = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.getCourse(req.userId!, req.params.id));
});

export const update = wrapAsync(async (req: Request, res: Response) => {
  const updated = await service.updateCourse(req.userId!, req.params.id, {
    title: req.body.title,
    description: req.body.description,
    isPublic: req.body.isPublic,
  });
  await auditFromRequest(
    req,
    "course.updated",
    "course",
    req.params.id,
    "success",
    undefined,
    { title: updated.title, isPublic: updated.is_public },
  );
  res.json(updated);
});

export const remove = wrapAsync(async (req: Request, res: Response) => {
  await service.deleteCourse(req.userId!, req.params.id);
  await auditFromRequest(
    req,
    "course.deleted",
    "course",
    req.params.id,
    "success",
  );
  res.status(204).end();
});

export const addDeck = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.addDeckToCourse(
    req.userId!,
    req.params.id,
    req.body.deck_id,
  );
  await auditFromRequest(
    req,
    "course.deck_added",
    "course",
    req.params.id,
    "success",
    undefined,
    { deckId: result.deck_id },
  );
  res.status(201).json(result);
});

export const removeDeck = wrapAsync(async (req: Request, res: Response) => {
  await service.removeDeckFromCourse(
    req.userId!,
    req.params.id,
    req.params.deckId,
  );
  await auditFromRequest(
    req,
    "course.deck_removed",
    "course",
    req.params.id,
    "success",
    undefined,
    { deckId: req.params.deckId },
  );
  res.status(204).end();
});

export const reorderDecks = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.reorderCourseDecks(
    req.userId!,
    req.params.id,
    req.body.order,
  );
  await auditFromRequest(
    req,
    "course.decks_reordered",
    "course",
    req.params.id,
    "success",
    undefined,
    { order: result.order },
  );
  res.json(result);
});
