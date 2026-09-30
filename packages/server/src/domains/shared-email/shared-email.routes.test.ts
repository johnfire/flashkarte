import request from "supertest";

jest.mock("./shared-email.service");
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import { createApp } from "../../app";
import * as service from "./shared-email.service";
import { resetSharedEmailConfigForTests } from "./shared-email.config";

const serviceMock = service as jest.Mocked<typeof service>;
const SECRET = "s".repeat(40);

beforeEach(() => {
  process.env.EMAIL_SERVICE_TENANTS = JSON.stringify({
    "notes-world": {
      secret: SECRET,
      fromAddress: "notes@example.com",
    },
  });
  resetSharedEmailConfigForTests();
  jest.clearAllMocks();
});

afterEach(() => {
  delete process.env.EMAIL_SERVICE_TENANTS;
  resetSharedEmailConfigForTests();
});

describe("shared email routes", () => {
  test("rejects a missing service credential", async () => {
    const response = await request(createApp())
      .post("/api/service-email/recipients")
      .send({ recipients: [] });

    expect(response.status).toBe(401);
    expect(serviceMock.upsertRecipients).not.toHaveBeenCalled();
  });

  test("derives the tenant from the service credential", async () => {
    serviceMock.upsertRecipients.mockResolvedValue({ count: 1 });

    const response = await request(createApp())
      .post("/api/service-email/recipients")
      .set("Authorization", `Bearer ${SECRET}`)
      .send({
        recipients: [
          {
            externalUserId: "notes-user-1",
            email: "person@example.com",
            emailVerified: true,
          },
        ],
      });

    expect(response.status).toBe(202);
    expect(serviceMock.upsertRecipients).toHaveBeenCalledWith(
      {
        slug: "notes-world",
        fromAddress: "notes@example.com",
        replyTo: null,
      },
      expect.anything(),
    );
  });
});
