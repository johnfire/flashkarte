jest.mock("./email.service");
jest.mock("../auth/auth.service");
jest.mock("../keys/keys.service", () => ({ resolveKey: jest.fn() }));
jest.mock("../audit/audit.service", () => ({
  auditFromRequest: jest.fn().mockResolvedValue(undefined),
}));

import request from "supertest";
import * as authService from "../auth/auth.service";
import * as service from "./email.service";
import { createApp } from "../../app";

const authMock = authService as jest.Mocked<typeof authService>;
const serviceMock = service as jest.Mocked<typeof service>;
const app = createApp();
const AUTH = "Bearer access-token";

const ADMIN = {
  id: "admin1",
  email: "admin@example.com",
  role: "user",
  accountType: "admin",
  emailVerifiedAt: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
  authMock.verifyAccessToken.mockReturnValue({
    sub: "admin1",
    email: ADMIN.email,
  } as never);
  authMock.getCurrentUser.mockResolvedValue(ADMIN as never);
});

test("queues a contact campaign for an admin", async () => {
  serviceMock.contactUsers.mockResolvedValue({
    id: "33333333-3333-4333-8333-333333333333",
    status: "queued",
    recipientCount: 1,
    sentCount: 0,
    failedCount: 0,
    createdAt: "2026-09-30T00:00:00.000Z",
  });

  const response = await request(app)
    .post("/api/admin/email/contact")
    .set("Authorization", AUTH)
    .send({
      subject: "Service update",
      textBody: "The service will be unavailable tonight.",
      recipientIds: ["11111111-1111-4111-8111-111111111111"],
    });

  expect(response.status).toBe(202);
  expect(response.body.campaign.status).toBe("queued");
  expect(serviceMock.contactUsers).toHaveBeenCalledWith(
    "admin1",
    "Service update",
    "The service will be unavailable tonight.",
    ["11111111-1111-4111-8111-111111111111"],
  );
});

test("rejects a contact campaign from a non-admin", async () => {
  authMock.getCurrentUser.mockResolvedValue({
    ...ADMIN,
    accountType: "free",
  } as never);

  const response = await request(app)
    .post("/api/admin/email/contact")
    .set("Authorization", AUTH)
    .send({
      subject: "Service update",
      textBody: "Body",
      recipientIds: ["11111111-1111-4111-8111-111111111111"],
    });

  expect(response.status).toBe(403);
  expect(serviceMock.contactUsers).not.toHaveBeenCalled();
});
