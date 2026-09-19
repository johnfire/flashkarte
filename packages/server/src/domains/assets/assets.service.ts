import { z } from "zod";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import { withLockedSubject } from "../lessons/lesson-context";
import * as subjectsRepo from "../subjects/subjects.repository";
import { getPool } from "../../db/client";
import * as repo from "./assets.repository";
import { sanitizeSvg } from "./svg-sanitizer";

/** A subject's diagrams: enough for a whole course, small enough that one runaway loop is caught. */
export const MAX_ASSETS_PER_SUBJECT = 300;

const newAssetSchema = z.object({
  svg: z.string({ error: "svg is required: the SVG source as text" }),
  description: z.string().trim().max(300, "description is too long").optional(),
});

const idSchema = z.string().uuid("That is not an asset id");

/** The reference an image block uses. */
export const assetSource = (id: string): string => `asset:${id}`;

async function requireOwnedSubjectId(
  userId: string,
  subjectId: string,
): Promise<void> {
  if (!(await subjectsRepo.findOwnedSubject(userId, subjectId, getPool()))) {
    throw new NotFoundError("Subject not found");
  }
}

/**
 * Stores a diagram. The SVG is cleaned first; what was dropped comes back so the author can fix
 * the source. The reply carries the `src` to put in an image block.
 */
export async function createAsset(
  userId: string,
  subjectId: string,
  input: unknown,
  authorKind: repo.AssetAuthor,
) {
  const fields = parse(newAssetSchema, input);
  const cleaned = sanitizeSvg(fields.svg);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    if ((await repo.countAssets(db, subject.id)) >= MAX_ASSETS_PER_SUBJECT) {
      throw new ValidationError(
        `A subject can hold at most ${MAX_ASSETS_PER_SUBJECT} images: remove one that is not used first`,
      );
    }
    const asset = await repo.insertAsset(db, {
      subjectId: subject.id,
      kind: "diagram",
      content: cleaned.svg,
      description: fields.description ?? null,
      authorKind,
    });
    return { ...asset, src: assetSource(asset.id), removed: cleaned.removed };
  });
}

export async function listAssets(userId: string, subjectId: string) {
  await requireOwnedSubjectId(userId, subjectId);
  const assets = await repo.listAssets(getPool(), subjectId);
  return assets.map((asset) => ({ ...asset, src: assetSource(asset.id) }));
}

/** The cleaned SVG, for serving. Another subject's asset is not found. */
export async function getAssetSvg(
  userId: string,
  subjectId: string,
  assetId: string,
): Promise<string> {
  await requireOwnedSubjectId(userId, subjectId);
  const id = idSchema.safeParse(assetId);
  // A diagram or a rendered formula: both are pictures of this subject.
  const svg = id.success
    ? await repo.findServableSvg(getPool(), subjectId, id.data)
    : null;
  if (svg === null) throw new NotFoundError("Image not found");
  return svg;
}

/** Removes an image nothing uses. One a screen or question points at (even in its history) stays. */
export async function deleteAsset(
  userId: string,
  subjectId: string,
  assetId: string,
) {
  const id = parse(idSchema, assetId);
  return withLockedSubject(userId, subjectId, async (db, subject) => {
    if (!(await repo.findAsset(db, subject.id, id)))
      throw new NotFoundError("Image not found");
    if (await repo.isAssetReferenced(db, subject.id, id)) {
      throw new ValidationError(
        "A screen or question still uses this image: point it at another image first (a finished lesson's history keeps its images)",
      );
    }
    await repo.removeAsset(db, subject.id, id);
    return { id };
  });
}
