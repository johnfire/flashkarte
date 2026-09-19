import { isValidScreenNumber, normalizeScreenNumber } from "@flashkarte/shared";
import type { Queryable } from "../../db/queryable";
import * as screensRepo from "../lessons/screens.repository";

/**
 * A screen by the number a person typed or a URL carried. Anything that is not a valid screen
 * number ("abc", "1..2") finds nothing, instead of reaching the database as a number it cannot read.
 */
export async function findScreenByNumberOrNull(
  db: Queryable,
  subjectId: string,
  raw: string,
): Promise<screensRepo.ScreenRow | null> {
  if (!isValidScreenNumber(raw)) return null;
  return screensRepo.findScreenByNumber(
    db,
    subjectId,
    normalizeScreenNumber(raw),
  );
}
