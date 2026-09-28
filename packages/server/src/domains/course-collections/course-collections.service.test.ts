jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  withTransaction: jest.fn((work) => work({})),
}));
jest.mock("./course-collections.repository");

import * as repository from "./course-collections.repository";
import {
  changeSubjectMembership,
  changeSubjectMemberships,
  enrollInCatalogCollection,
} from "./course-collections.service";

const repositoryMock = repository as jest.Mocked<typeof repository>;
const COLLECTION_ID = "28c5885a-2488-4e9f-b15c-1ab006f2239e";
const FIRST_SUBJECT_ID = "84de1460-7ef1-4a0e-a4f0-842856e11ce7";
const SECOND_SUBJECT_ID = "6cbec507-6773-424d-95dc-876016f028ad";

beforeEach(() => {
  jest.clearAllMocks();
  repositoryMock.findCollectionForUpdate.mockResolvedValue({
    id: COLLECTION_ID,
    title: "Art of Electronics",
    is_official: true,
  } as never);
  repositoryMock.setSubjectCollection.mockResolvedValue(true);
});

describe("course collection membership", () => {
  test("allows a curated collection to contain a privately authored course", async () => {
    repositoryMock.findSubjectSource.mockResolvedValue(false);

    await changeSubjectMembership(FIRST_SUBJECT_ID, {
      collectionId: COLLECTION_ID,
      position: 0,
    });

    expect(repositoryMock.setSubjectCollection).toHaveBeenCalledWith(
      expect.anything(),
      FIRST_SUBJECT_ID,
      COLLECTION_ID,
      0,
    );
  });

  test("assigns a complete course sequence atomically in its supplied order", async () => {
    repositoryMock.findSubjectSource.mockResolvedValue(true);

    await changeSubjectMemberships(COLLECTION_ID, {
      subjectIds: [FIRST_SUBJECT_ID, SECOND_SUBJECT_ID],
    });

    expect(repositoryMock.setSubjectCollection).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      FIRST_SUBJECT_ID,
      COLLECTION_ID,
      0,
    );
    expect(repositoryMock.setSubjectCollection).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      SECOND_SUBJECT_ID,
      COLLECTION_ID,
      1,
    );
  });
});

describe("catalogue collection enrollment", () => {
  test("enrolls every public community course in an available collection", async () => {
    repositoryMock.findCatalogCollection.mockResolvedValue({
      id: COLLECTION_ID,
      title: "Art of Electronics",
    } as never);
    repositoryMock.enrollAllInCatalogCollection.mockResolvedValue(15);

    await expect(
      enrollInCatalogCollection("learner-1", COLLECTION_ID, false),
    ).resolves.toBe(15);
    expect(repositoryMock.enrollAllInCatalogCollection).toHaveBeenCalledWith(
      "learner-1",
      COLLECTION_ID,
      false,
    );
  });

  test("does not enroll courses from a collection outside the catalogue source", async () => {
    repositoryMock.findCatalogCollection.mockResolvedValue(null);

    await expect(
      enrollInCatalogCollection("learner-1", COLLECTION_ID, true),
    ).rejects.toThrow("Course collection not found");
    expect(repositoryMock.enrollAllInCatalogCollection).not.toHaveBeenCalled();
  });
});
