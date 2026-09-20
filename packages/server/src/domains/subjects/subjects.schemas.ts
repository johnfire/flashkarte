import { z } from "zod";
import {
  CONCEPT_KINDS,
  CONCEPT_TIERS,
  EDGE_STRENGTHS,
} from "@flashkarte/shared";

export const titleSchema = z
  .string({ error: "Title is required" })
  .trim()
  .min(1, "Title is required")
  .max(200, "Title is too long");

export const descriptionSchema = z.string().trim().max(2000).nullable();

export const localeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/,
    "locale must be a BCP-47 language tag",
  );

export const slugSchema = z
  .string({ error: "slug is required" })
  .regex(
    /^[a-z0-9][a-z0-9-]{0,62}$/,
    "slug must be lowercase letters, digits and hyphens (at most 63 characters)",
  );

export const conceptNameSchema = z
  .string({ error: "name is required" })
  .trim()
  .min(1, "name is required")
  .max(200, "name is too long");

export const editionSchema = z.object({
  locale: localeSchema,
  title: titleSchema,
  description: descriptionSchema.nullish(),
  concept_names: z.record(slugSchema, conceptNameSchema),
});

export const kindSchema = z.enum(CONCEPT_KINDS, {
  error: `kind must be one of: ${CONCEPT_KINDS.join(", ")}`,
});
export const tierSchema = z.enum(CONCEPT_TIERS, {
  error: `tier must be one of: ${CONCEPT_TIERS.join(", ")}`,
});
export const strengthSchema = z.enum(EDGE_STRENGTHS, {
  error: `strength must be one of: ${EDGE_STRENGTHS.join(", ")}`,
});

export const conceptCardIdsSchema = z
  .array(z.string().uuid("Each card id must be a UUID"))
  .max(500, "A concept can link at most 500 cards");

export const newConceptSchema = z.object({
  slug: slugSchema,
  name: conceptNameSchema,
  kind: kindSchema,
  tier: tierSchema.default("core"),
});

export const conceptPatchSchema = z.object({
  name: conceptNameSchema.optional(),
  kind: kindSchema.optional(),
  tier: tierSchema.optional(),
});

export const edgeSchema = z
  .object({
    from: slugSchema,
    to: slugSchema,
    strength: strengthSchema,
    reason: z.string().trim().max(500).nullish(),
  })
  .refine((edge) => edge.strength !== "requires" || !!edge.reason, {
    message: "A 'requires' edge needs a reason",
    path: ["reason"],
  });

export const importSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.nullish(),
  concepts: z
    .array(newConceptSchema.extend({ cards: conceptCardIdsSchema.default([]) }))
    .min(1, "A subject needs at least one concept")
    .max(500, "A subject can import at most 500 concepts"),
  edges: z.array(edgeSchema).max(5000, "Too many edges"),
});

export type NewConcept = z.infer<typeof newConceptSchema>;
export type EdgeInput = z.infer<typeof edgeSchema>;
export type SubjectImport = z.infer<typeof importSchema>;
