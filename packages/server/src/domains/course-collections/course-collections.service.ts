import { getPool, withTransaction } from "../../db/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import { contentLanguageFilterSchema } from "../library/content-language";
import * as repository from "./course-collections.repository";
import {
  courseCollectionMembershipSchema,
  courseCollectionSchema,
} from "./course-collections.schemas";

export function listCatalogCollections(
  isOfficial: boolean,
  languageInput?: unknown,
) {
  const language = parse(contentLanguageFilterSchema, languageInput);
  return repository.listCatalogCollections(isOfficial, language);
}

export async function getCatalogCollection(
  id: string,
  isOfficial: boolean,
  languageInput?: unknown,
) {
  const language = parse(contentLanguageFilterSchema, languageInput);
  const collection = await repository.findCatalogCollection(id, isOfficial);
  if (!collection) throw new NotFoundError("Course collection not found");
  const courses = await repository.listCatalogCourses(id, isOfficial, language);
  return { ...collection, courses };
}

export async function createCollection(input: unknown) {
  const fields = parse(courseCollectionSchema, input);
  return repository.createCollection(getPool(), fields);
}

export async function changeSubjectMembership(
  subjectId: string,
  input: unknown,
): Promise<void> {
  const membership = parse(courseCollectionMembershipSchema, input);
  await withTransaction(async (db) => {
    const subjectSource = await repository.findSubjectSource(db, subjectId);
    if (subjectSource === null) throw new NotFoundError("Course not found");
    if (membership.collectionId === null) {
      await repository.setSubjectCollection(db, subjectId, null, null);
      return;
    }
    const collection = await repository.findCollectionForUpdate(
      db,
      membership.collectionId,
    );
    if (!collection) throw new NotFoundError("Course collection not found");
    if (collection.is_official !== subjectSource) {
      throw new ValidationError(
        "A course can only join a collection from the same catalogue source",
      );
    }
    await repository.setSubjectCollection(
      db,
      subjectId,
      collection.id,
      membership.position ?? null,
    );
  });
}
