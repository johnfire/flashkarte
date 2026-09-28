import request from "supertest";

jest.mock("./course-collections.service");
jest.mock("../../middleware/auth", () => {
  const pass = (
    _req: import("express").Request,
    _res: import("express").Response,
    next: import("express").NextFunction,
  ) => next();
  return {
    requireFullScope: pass,
    requireVerified: pass,
    requireAdmin: pass,
    requireAuth: pass,
  };
});

import { createApp } from "../../app";
import { NotFoundError } from "../../utils/errors";
import * as service from "./course-collections.service";

const serviceMock = service as jest.Mocked<typeof service>;
const app = createApp();

beforeEach(() => jest.clearAllMocks());

describe("course collection catalogue routes", () => {
  test("lists official collections in the requested explanation language", async () => {
    serviceMock.listCatalogCollections.mockResolvedValue([
      { id: "ai", title: "Artificial Intelligence", course_count: 2 },
    ] as never);

    const response = await request(app).get(
      "/api/course-collections?source=official&language=en",
    );

    expect(response.status).toBe(200);
    expect(serviceMock.listCatalogCollections).toHaveBeenCalledWith(true, "en");
  });

  test("returns a collection and its public courses", async () => {
    serviceMock.getCatalogCollection.mockResolvedValue({
      id: "electronics",
      title: "The Art of Electronics",
      courses: [],
    } as never);

    const response = await request(app).get(
      "/api/course-collections/electronics?source=community",
    );

    expect(response.status).toBe(200);
    expect(serviceMock.getCatalogCollection).toHaveBeenCalledWith(
      "electronics",
      false,
      undefined,
    );
  });

  test("does not expose a collection outside its catalogue source", async () => {
    serviceMock.getCatalogCollection.mockRejectedValue(
      new NotFoundError("Course collection not found"),
    );

    const response = await request(app).get(
      "/api/course-collections/private?source=official",
    );

    expect(response.status).toBe(404);
  });
});
