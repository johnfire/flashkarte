import { Request, Response } from "express";
import { requireAuth } from "./auth";
import * as keysService from "../domains/keys/keys.service";
import * as authService from "../domains/auth/auth.service";

jest.mock("../domains/keys/keys.service");
jest.mock("../domains/auth/auth.service");

const mockKeys = keysService as jest.Mocked<typeof keysService>;
const mockAuth = authService as jest.Mocked<typeof authService>;

function run(authorization?: string) {
  const req = { headers: { authorization } } as Request;
  const res = {} as Response;
  return new Promise<{ req: Request; err: unknown }>((resolve) => {
    requireAuth(req, res, (err?: unknown) => resolve({ req, err }));
  });
}

beforeEach(() => jest.clearAllMocks());

describe("requireAuth", () => {
  test("resolves an fk_ API key to its user", async () => {
    mockKeys.resolveKey.mockResolvedValue("user-123");
    const { req, err } = await run("Bearer fk_secretkey");
    expect(err).toBeUndefined();
    expect(req.userId).toBe("user-123");
    expect(mockKeys.resolveKey).toHaveBeenCalledWith("fk_secretkey");
  });

  test("rejects an unknown fk_ key", async () => {
    mockKeys.resolveKey.mockResolvedValue(null);
    const { err } = await run("Bearer fk_bogus");
    expect(err).toBeTruthy();
  });

  test("falls back to JWT verification for non-fk tokens", async () => {
    mockAuth.verifyAccessToken.mockReturnValue({
      sub: "jwt-user",
      email: "a@b.com",
    });
    const { req, err } = await run("Bearer some.jwt.token");
    expect(err).toBeUndefined();
    expect(req.userId).toBe("jwt-user");
  });

  test("missing header errors", async () => {
    const { err } = await run(undefined);
    expect(err).toBeTruthy();
  });
});
