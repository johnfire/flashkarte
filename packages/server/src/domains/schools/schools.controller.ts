import { Request, Response } from "express";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";
import * as service from "./schools.service";

export const listSchools = wrapAsync(async (_req: Request, res: Response) => {
  res.json({ schools: await service.listSchools() });
});

export const getSchool = wrapAsync(async (req: Request, res: Response) => {
  res.json({ school: await service.getSchool(req.params.id) });
});

export const createSchool = wrapAsync(async (req: Request, res: Response) => {
  const school = await service.createSchool(req.body?.name);
  await auditFromRequest(
    req,
    "admin.school_created",
    "school",
    school.id,
    "success",
    undefined,
    { name: school.name },
  );
  res.status(201).json({ school });
});

export const setOrganization = wrapAsync(
  async (req: Request, res: Response) => {
    await service.setOrganization(req.params.id, req.body);
    await auditFromRequest(
      req,
      "admin.user_organization_changed",
      "user",
      req.params.id,
      "success",
      undefined,
      {
        accountKind: req.body?.accountKind,
        schoolId: req.body?.schoolId ?? null,
      },
    );
    res.status(204).end();
  },
);

export const verifyTeacher = wrapAsync(async (req: Request, res: Response) => {
  await service.verifyTeacher(req.userId!, req.params.id, req.body);
  await auditFromRequest(
    req,
    "admin.teacher_verified",
    "user",
    req.params.id,
    "success",
    undefined,
    { method: req.body?.method, schoolId: req.body?.schoolId ?? null },
  );
  res.status(204).end();
});

export const listClasses = wrapAsync(async (_req: Request, res: Response) => {
  res.json({ classes: await service.listClasses() });
});

export const getClass = wrapAsync(async (req: Request, res: Response) => {
  res.json({ class: await service.getClass(req.params.id) });
});

export const createClass = wrapAsync(async (req: Request, res: Response) => {
  const created = await service.createClass(req.body);
  await auditFromRequest(
    req,
    "admin.class_created",
    "class",
    created.id,
    "success",
    undefined,
    { teacherId: created.teacherId, name: created.name },
  );
  res.status(201).json({ class: created });
});

export const deleteClass = wrapAsync(async (req: Request, res: Response) => {
  await service.deleteClass(req.params.id);
  await auditFromRequest(
    req,
    "admin.class_deleted",
    "class",
    req.params.id,
    "success",
  );
  res.status(204).end();
});

export const setClassMembers = wrapAsync(
  async (req: Request, res: Response) => {
    await service.setClassMembers(req.params.id, req.body?.studentIds);
    await auditFromRequest(
      req,
      "admin.class_members_changed",
      "class",
      req.params.id,
      "success",
      undefined,
      {
        count: Array.isArray(req.body?.studentIds)
          ? req.body.studentIds.length
          : 0,
      },
    );
    res.status(204).end();
  },
);
