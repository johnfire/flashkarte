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
