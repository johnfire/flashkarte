import type { Request, Response } from "express";
import { z } from "zod";
import { query, queryOne } from "../../db/client";
import { parse } from "../../utils/validate";
import { wrapAsync } from "../../utils/wrapAsync";
import { auditFromRequest } from "../audit/audit.service";

const pageSchema = z.enum(["library", "courses", "decks"]);
const preferenceSchema = z.enum(["all", "en", "de", "ar"]);

export const listContentLanguagePreferences = wrapAsync(
  async (req: Request, res: Response) => {
    const rows = await query<{ page: string; language: string }>(
      "SELECT page, language FROM content_language_preferences WHERE user_id = $1",
      [req.userId!],
    );
    res.json(
      Object.fromEntries(rows.map(({ page, language }) => [page, language])),
    );
  },
);

export const saveContentLanguagePreference = wrapAsync(
  async (req: Request, res: Response) => {
    const page = parse(pageSchema, req.params.page);
    const language = parse(preferenceSchema, req.body.language);
    const saved = await queryOne<{ page: string; language: string }>(
      `INSERT INTO content_language_preferences (user_id, page, language)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, page) DO UPDATE SET language = EXCLUDED.language
     RETURNING page, language`,
      [req.userId!, page, language],
    );
    await auditFromRequest(
      req,
      "account.content_language_preference_updated",
      "user",
      req.userId!,
      "success",
      undefined,
      { page, language },
    );
    res.json(saved);
  },
);
