import { getPool, withTransaction } from "../../db/client";
import { NotFoundError, ValidationError } from "../../utils/errors";
import { parse } from "../../utils/validate";
import { contentLanguageFilterSchema } from "../library/content-language";
import * as repository from "./course-collections.repository";
import {
  courseCollectionMembershipSchema,
  courseCollectionMembersSchema,
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

/** Add all public courses from one catalogue collection to a learner's plan. */
export async function enrollInCatalogCollection(
  userId: string,
  collectionId: string,
  isOfficial: boolean,
): Promise<number> {
  const collection = await repository.findCatalogCollection(
    collectionId,
    isOfficial,
  );
  if (!collection) throw new NotFoundError("Course collection not found");
  return repository.enrollAllInCatalogCollection(
    userId,
    collectionId,
    isOfficial,
  );
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
    await repository.setSubjectCollection(
      db,
      subjectId,
      collection.id,
      membership.position ?? null,
    );
  });
}

/** Move a complete teaching sequence into one collection, in its displayed order. */
export async function changeSubjectMemberships(
  collectionIdInput: unknown,
  input: unknown,
): Promise<void> {
  const { subjectIds } = parse(courseCollectionMembersSchema, input);
  const membership = parse(courseCollectionMembershipSchema, {
    collectionId: collectionIdInput,
  });
  const collectionId = membership.collectionId;
  if (collectionId === null) {
    throw new ValidationError("Choose a course collection");
  }
  await withTransaction(async (db) => {
    const collection = await repository.findCollectionForUpdate(
      db,
      collectionId,
    );
    if (!collection) throw new NotFoundError("Course collection not found");
    for (const [position, subjectId] of subjectIds.entries()) {
      const subjectSource = await repository.findSubjectSource(db, subjectId);
      if (subjectSource === null) throw new NotFoundError("Course not found");
      await repository.setSubjectCollection(
        db,
        subjectId,
        collection.id,
        position,
      );
    }
  });
}
