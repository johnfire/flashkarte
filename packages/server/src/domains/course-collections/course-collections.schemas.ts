import { z } from "zod";
import { descriptionSchema, titleSchema } from "../subjects/subjects.schemas";

export const courseCollectionSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  isOfficial: z.boolean(),
});

export const courseCollectionMembershipSchema = z.object({
  collectionId: z.string().uuid().nullable(),
  position: z.number().int().min(0).nullable().optional(),
});

export const courseCollectionMembersSchema = z.object({
  subjectIds: z
    .array(z.string().uuid())
    .min(1, "Choose at least one course")
    .max(100, "A collection can update at most 100 courses at once")
    .refine(
      (subjectIds) => new Set(subjectIds).size === subjectIds.length,
      "Each course can only appear once",
    ),
});
