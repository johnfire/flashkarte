import { z } from "zod";
import { ValidationError } from "./errors";

/**
 * Endpoint validation pattern: define a named Zod schema near the domain
 * boundary, then call parse(schema, untrustedInput). Keep state-dependent
 * business rules in the service after parsing.
 */
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }
  return result.data;
}

export const emailSchema = z
  .string({ error: "A valid email is required" })
  .email("A valid email is required")
  .transform((s) => s.toLowerCase());

export const passwordSchema = z
  .string({ error: "Password must be at least 8 characters" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be 128 characters or fewer");

// --- Speech settings (Spec 09) ---

// Shape-only BCP-47: language, optional script, optional region.
const BCP47 = /^[A-Za-z]{2,3}(-[A-Za-z]{4})?(-([A-Za-z]{2}|\d{3}))?$/;

/**
 * A language tag naming a TTS voice.
 *
 * Validated on shape only — deliberately NOT against the UI locale list
 * (`SUPPORTED_LANGUAGES`, en/de/fr/es). Which voices exist is a property of the
 * user's device, not of this server: a learner may legitimately want `ja-JP`,
 * and an unavailable voice degrades to silence on the client rather than being
 * rejected here. Blank is normalised to null so a client can clear the field.
 */
export const speechLangSchema = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z
    .string({ error: "Language tag must be text" })
    .max(35, "Language tag is too long")
    .regex(BCP47, "Language must be a BCP-47 tag such as de-DE")
    .nullable(),
);

export const speechAutoplaySchema = z.enum(["off", "front", "back", "both"], {
  error: "Autoplay must be off, front, back or both",
});

export const speechRateSchema = z
  .number({ error: "Speech rate must be a number" })
  .min(0.5, "Speech rate must be between 0.5 and 2")
  .max(2, "Speech rate must be between 0.5 and 2");
