import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as concepts from "./concepts.service";
import * as service from "./subjects.service";
import { importSubject } from "./subjects-import.service";

/** Every state change is audit-logged against the subject, with the AI actor when it is an agent key. */
function auditSubject(
  req: Request,
  action: string,
  subjectId: string,
  afterState?: unknown,
) {
  return auditFromRequest(
    req,
    action,
    "subject",
    subjectId,
    "success",
    undefined,
    afterState,
  );
}

export const create = wrapAsync(async (req: Request, res: Response) => {
  const subject = await service.createSubject(
    req.userId!,
    req.body.title,
    req.body.description,
  );
  await auditSubject(req, "subject.created", subject.id, {
    title: subject.title,
  });
  res.status(201).json(subject);
});

export const importFromJson = wrapAsync(async (req: Request, res: Response) => {
  const result = await importSubject(req.userId!, req.body);
  await auditSubject(req, "subject.imported", result.subject.id, {
    title: result.subject.title,
    concepts: result.concept_count,
    edges: result.edge_count,
  });
  res.status(201).json(result);
});

export const list = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.listSubjects(req.userId!));
});

export const get = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.getSubject(req.userId!, req.params.id));
});

export const progress = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.getSubjectProgress(req.userId!, req.params.id));
});

export const lint = wrapAsync(async (req: Request, res: Response) => {
  res.json({ issues: await service.lintSubject(req.userId!, req.params.id) });
});

export const createCourseFamily = wrapAsync(
  async (req: Request, res: Response) => {
    const result = await service.createCourseFamily(
      req.userId!,
      req.params.id,
      req.body.locale,
    );
    await auditSubject(req, "course_family.created", req.params.id, {
      courseFamilyId: result.family.id,
      locale: result.edition.locale,
    });
    res.status(201).json(result);
  },
);

export const createEdition = wrapAsync(async (req: Request, res: Response) => {
  const result = await service.createLocalizedEdition(
    req.userId!,
    req.params.id,
    req.body,
  );
  await auditSubject(req, "course_edition.created", result.edition.id, {
    courseFamilyId: result.family.id,
    locale: result.edition.locale,
    canonicalSubjectId: req.params.id,
  });
  res.status(201).json(result);
});

export const listEditions = wrapAsync(async (req: Request, res: Response) => {
  res.json(await service.getCourseEditions(req.userId!, req.params.id));
});

export const update = wrapAsync(async (req: Request, res: Response) => {
  const updated = await service.updateSubject(req.userId!, req.params.id, {
    title: req.body.title,
    description: req.body.description,
    isPublic: req.body.isPublic,
  });
  await auditSubject(req, "subject.updated", req.params.id, {
    title: updated.title,
    isPublic: updated.is_public,
  });
  res.json(updated);
});

export const remove = wrapAsync(async (req: Request, res: Response) => {
  await service.deleteSubject(req.userId!, req.params.id);
  await auditSubject(req, "subject.deleted", req.params.id);
  res.status(204).end();
});

export const addConcept = wrapAsync(async (req: Request, res: Response) => {
  const created = await concepts.addConcept(
    req.userId!,
    req.params.id,
    req.body,
  );
  await auditSubject(req, "subject.concept_added", req.params.id, {
    slug: created.slug,
    kind: created.kind,
  });
  res.status(201).json(created);
});

export const updateConcept = wrapAsync(async (req: Request, res: Response) => {
  const updated = await concepts.updateConcept(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.body,
  );
  await auditSubject(req, "subject.concept_updated", req.params.id, {
    slug: updated.slug,
  });
  res.json(updated);
});

export const removeConcept = wrapAsync(async (req: Request, res: Response) => {
  await concepts.deleteConcept(req.userId!, req.params.id, req.params.slug);
  await auditSubject(req, "subject.concept_removed", req.params.id, {
    slug: req.params.slug,
  });
  res.status(204).end();
});

export const linkCards = wrapAsync(async (req: Request, res: Response) => {
  const linked = await concepts.linkCards(
    req.userId!,
    req.params.id,
    req.params.slug,
    req.body.card_ids,
  );
  await auditSubject(req, "subject.cards_linked", req.params.id, {
    slug: req.params.slug,
    cards: linked.card_ids.length,
  });
  res.json(linked);
});

export const setEdge = wrapAsync(async (req: Request, res: Response) => {
  const edge = await concepts.setEdge(req.userId!, req.params.id, req.body);
  await auditSubject(req, "subject.edge_set", req.params.id, edge);
  res.json(edge);
});

export const removeEdge = wrapAsync(async (req: Request, res: Response) => {
  await concepts.removeEdge(
    req.userId!,
    req.params.id,
    req.params.from,
    req.params.to,
  );
  await auditSubject(req, "subject.edge_removed", req.params.id, {
    from: req.params.from,
    to: req.params.to,
  });
  res.status(204).end();
});
