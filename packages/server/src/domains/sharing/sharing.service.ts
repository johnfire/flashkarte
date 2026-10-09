import { z } from "zod";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import { getShareOptions } from "../schools/schools.service";
import * as repo from "./sharing.repository";
import type { ShareableType, ShareRow, ShareScope } from "./sharing.repository";

export type { ShareableType, ShareScope };

const shareInputSchema = z.object({
  shares: z
    .array(
      z.object({
        scope: z.enum(["school", "class", "teacher_students"], {
          error: "scope must be school, class or teacher_students",
        }),
        classId: z.uuid({ error: "Invalid class id" }).optional(),
      }),
      { error: "shares must be a list" },
    )
    .max(100, "Too many shares"),
});

export interface Share {
  scope: ShareScope;
  schoolId: string | null;
  classId: string | null;
}

const NOUN: Record<ShareableType, string> = {
  deck: "Deck",
  course: "Course",
  subject: "Course",
};

function toShare(row: ShareRow): Share {
  return { scope: row.scope, schoolId: row.school_id, classId: row.class_id };
}

async function requireOwned(type: ShareableType, userId: string, id: string) {
  const item = await repo.findOwned(type, userId, id);
  if (!item) throw new NotFoundError(`${NOUN[type]} not found`);
  if (item.is_official) {
    throw new ValidationError("App content is already shared with everyone");
  }
}

/** The item's current audiences plus the ones this owner may choose from. */
export async function getShares(
  type: ShareableType,
  userId: string,
  id: string,
) {
  await requireOwned(type, userId, id);
  const [shares, options] = await Promise.all([
    repo.listShares(type, id),
    getShareOptions(userId),
  ]);
  return { shares: shares.map(toShare), options };
}

/**
 * Replace the item's audiences. Every requested audience is checked against
 * what this owner may share with right now; one disallowed entry rejects the
 * whole request, so nothing is ever half-shared.
 */
export async function setShares(
  type: ShareableType,
  userId: string,
  id: string,
  input: unknown,
) {
  await requireOwned(type, userId, id);
  const { shares } = parse(shareInputSchema, input);
  const options = await getShareOptions(userId);
  const allowedClassIds = new Set(options.classes.map((c) => c.id));

  const rows: ShareRow[] = [];
  const seen = new Set<string>();
  for (const share of shares) {
    let row: ShareRow;
    if (share.scope === "school") {
      if (!options.canShareWithSchool || !options.school) {
        throw new ValidationError("You cannot share with a school");
      }
      row = { scope: "school", school_id: options.school.id, class_id: null };
    } else if (share.scope === "class") {
      if (!share.classId || !allowedClassIds.has(share.classId)) {
        throw new ValidationError("You can only share with your own classes");
      }
      row = { scope: "class", school_id: null, class_id: share.classId };
    } else {
      if (!options.canShareWithAllStudents) {
        throw new ValidationError(
          "Only a teacher can share with their students",
        );
      }
      row = { scope: "teacher_students", school_id: null, class_id: null };
    }
    const key = `${row.scope}:${row.school_id ?? row.class_id ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      rows.push(row);
    }
  }

  await repo.replaceShares(type, id, rows);
  return {
    shares: (await repo.listShares(type, id)).map(toShare),
    options,
  };
}
