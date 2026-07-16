import { z } from "zod";
import { ValidationError } from "./errors";

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
