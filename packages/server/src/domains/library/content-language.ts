import { z } from "zod";
import { CONTENT_LANGUAGES } from "@flashkarte/shared";

export const contentLanguageSchema = z.enum(CONTENT_LANGUAGES);
export const contentLanguageFilterSchema = contentLanguageSchema.optional();
export type ContentLanguage = z.infer<typeof contentLanguageSchema>;
