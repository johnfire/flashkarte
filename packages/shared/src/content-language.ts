/** Languages currently offered for the language of teaching and explanations. */
export const CONTENT_LANGUAGES = ["en", "de", "ar"] as const;
export type ContentLanguage = (typeof CONTENT_LANGUAGES)[number];
