import request from "supertest";
jest.mock("./promo.service");
jest.mock("../auth/auth.service");
jest.mock("../keys/keys.service", () => ({ resolveKey: jest.fn() }));
jest.mock("../../db/client");
import * as service from "./promo.service";
import * as authService from "../auth/auth.service";
import { createApp } from "../../app";

const app = createApp();
const ADMIN = {
  id: "admin1",
  email: "admin@example.com",
  accountType: "admin",
  role: "user",
  emailVerifiedAt: "2026-01-01T00:00:00Z",
};
const PREVIEW = {
  code: "WELCOME20",
  kind: "discount" as const,
  percentOff: 20,
  discountDuration: "once" as const,
  freeDays: null,
  eligiblePlan: "any" as const,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(authService.verifyAccessToken)
    .mockReturnValue({ sub: ADMIN.id, email: ADMIN.email } as never);
  jest.mocked(authService.getCurrentUser).mockResolvedValue(ADMIN as never);
});

test("previews codes without requiring an account", async () => {
  jest.mocked(service.previewPromo).mockResolvedValue(PREVIEW);
  const response = await request(app)
    .post("/api/auth/promos/preview")
    .send({ code: "WELCOME20" });
  expect(response.status).toBe(200);
  expect(response.body).toEqual(PREVIEW);
  expect(service.previewPromo).toHaveBeenCalledWith("WELCOME20");
});

test.each(["get", "post", "patch"] as const)(
  "rejects unauthenticated admin promo %s",
  async (method) => {
    const endpoint =
      method === "patch" ? "/api/admin/promos/promo-1" : "/api/admin/promos";
    const http = request(app);
    const response = await http[method](endpoint).send({});
    expect(response.status).toBe(401);
    expect(service.listPromos).not.toHaveBeenCalled();
    expect(service.createPromo).not.toHaveBeenCalled();
    expect(service.setPromoActive).not.toHaveBeenCalled();
  },
);

test.each(["get", "post", "patch"] as const)(
  "rejects non-admin promo %s",
  async (method) => {
    jest
      .mocked(authService.getCurrentUser)
      .mockResolvedValue({ ...ADMIN, accountType: "free" } as never);
    const endpoint =
      method === "patch" ? "/api/admin/promos/promo-1" : "/api/admin/promos";
    const http = request(app);
    const response = await http[method](endpoint)
      .set("Authorization", "Bearer access-token")
      .send({});
    expect(response.status).toBe(403);
    expect(service.listPromos).not.toHaveBeenCalled();
    expect(service.createPromo).not.toHaveBeenCalled();
    expect(service.setPromoActive).not.toHaveBeenCalled();
  },
);

test("passes the authenticated admin actor when creating a promo", async () => {
  jest.mocked(service.createPromo).mockResolvedValue({
    ...PREVIEW,
    id: "promo-1",
    expiresAt: null,
    maxActivations: null,
    activationCount: 0,
    active: true,
  });
  const response = await request(app)
    .post("/api/admin/promos")
    .set("Authorization", "Bearer access-token")
    .send({ code: "WELCOME20", kind: "discount" });
  expect(response.status).toBe(201);
  expect(service.createPromo).toHaveBeenCalledWith(
    { code: "WELCOME20", kind: "discount" },
    { type: "user", id: ADMIN.id },
  );
});
