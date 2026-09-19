import { z } from "zod";
import { slugSchema, titleSchema } from "../subjects/subjects.schemas";

export { slugSchema, titleSchema };

export const summarySchema = z.string().trim().max(1000, "summary is too long");
const moduleIdSchema = z.string().uuid("module must be a module id").nullable();
const slugList = z.array(slugSchema).max(50, "too many concepts");

export const newModuleSchema = z.object({ title: titleSchema });
export const modulePatchSchema = z.object({
  title: titleSchema.optional(),
  position: z.number().int().min(0).optional(),
});

export const newLessonSchema = z.object({
  slug: slugSchema,
  title: titleSchema,
  summary: summarySchema.default(""),
  module: moduleIdSchema.optional(),
  covers: slugList.default([]),
});
export const lessonPatchSchema = z.object({
  title: titleSchema.optional(),
  summary: summarySchema.optional(),
  module: moduleIdSchema.optional(),
  covers: slugList.optional(),
});

export const prerequisiteSchema = z.object({
  from: slugSchema,
  reason: z
    .string({ error: "A prerequisite needs a reason" })
    .trim()
    .min(1, "A prerequisite needs a reason")
    .max(500),
});

/** Where a new screen goes: an explicit number, right after or before another, or (none) the end. */
export const placeSchema = z
  .object({
    number: z.string().optional(),
    after: z.string().optional(),
    before: z.string().optional(),
  })
  .refine(
    (place) =>
      [place.number, place.after, place.before].filter(Boolean).length <= 1,
    {
      message: "Give at most one of number, after and before",
    },
  );

const sourcesSchema = z
  .array(
    z.object({
      title: z.string().max(300),
      url: z.string().url().max(1000).optional(),
    }),
  )
  .max(20)
  .optional();

export const newScreenSchema = z.object({
  blocks: z.unknown(),
  place: placeSchema.optional(),
  sources: sourcesSchema,
});
export const screenPatchSchema = z.object({
  blocks: z.unknown().optional(),
  number: z.string().optional(),
});

const optionSchema = z.object({
  correct: z.boolean({ error: "each option needs correct: true or false" }),
  blocks: z.unknown(),
  reason: z.unknown(),
});
export const optionsSchema = z.array(optionSchema).max(8, "at most 8 options");
/** Screen numbers (or, in an import, refs) of the screens that teach a question. */
const teachesList = z.array(z.string()).max(30);

export const newQuestionSchema = z.object({
  prompt: z.unknown(),
  options: optionsSchema,
  teaches: teachesList,
  covers: slugList,
  variants: z
    .array(z.object({ prompt: z.unknown(), options: optionsSchema }))
    .max(10)
    .optional(),
});
export const variantSchema = z.object({
  prompt: z.unknown(),
  options: optionsSchema,
});
export const questionPatchSchema = z.object({
  prompt: z.unknown().optional(),
  options: optionsSchema.optional(),
  teaches: teachesList.optional(),
  covers: slugList.optional(),
});

export type Place = z.infer<typeof placeSchema>;
export type NewQuestion = z.infer<typeof newQuestionSchema>;

const refSchema = z.string().trim().min(1).max(60);

/** A whole lesson in one call: every screen and question, atomic. */
export const importLessonSchema = z.object({
  /** A module title; found by that title or created. */
  module: z.string().trim().min(1).max(200).optional(),
  lesson: z.object({
    slug: slugSchema,
    title: titleSchema,
    summary: summarySchema.default(""),
    covers: slugList.default([]),
    prerequisites: z
      .array(
        z.object({
          lesson: slugSchema,
          reason: prerequisiteSchema.shape.reason,
        }),
      )
      .max(20)
      .default([]),
  }),
  screens: z
    .array(
      z.object({
        /** A local name so a question can say which screen teaches it before numbers exist. */
        ref: refSchema.optional(),
        number: z.string().optional(),
        blocks: z.unknown(),
        sources: sourcesSchema,
      }),
    )
    .max(60, "at most 60 screens per lesson"),
  questions: z
    .array(
      z.object({
        prompt: z.unknown(),
        options: optionsSchema,
        teaches: teachesList,
        covers: slugList,
        variants: z
          .array(z.object({ prompt: z.unknown(), options: optionsSchema }))
          .max(10)
          .optional(),
      }),
    )
    .max(30, "at most 30 questions per lesson"),
});
export type LessonImport = z.infer<typeof importLessonSchema>;
