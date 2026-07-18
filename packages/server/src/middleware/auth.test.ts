import { Request, Response } from "express";
import { requireAuth, requireFullScope, requireVerified } from "./auth";
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
  test("resolves a full-scope fk_ API key to its user", async () => {
    mockKeys.resolveKey.mockResolvedValue({
      userId: "user-123",
      scope: "full",
      keyPrefix: "fk_secretkey",
    });
    const { req, err } = await run("Bearer fk_secretkey");
    expect(err).toBeUndefined();
    expect(req.userId).toBe("user-123");
    expect(req.keyScope).toBe("full");
    expect(req.keyPrefix).toBe("fk_secretkey");
    expect(mockKeys.resolveKey).toHaveBeenCalledWith("fk_secretkey");
  });

  test("carries the deck scope through from a deck-scoped key", async () => {
    mockKeys.resolveKey.mockResolvedValue({
      userId: "user-123",
      scope: "deck",
      keyPrefix: "fk_deckkey",
    });
    const { req, err } = await run("Bearer fk_deckkey");
    expect(err).toBeUndefined();
    expect(req.keyScope).toBe("deck");
    expect(req.keyPrefix).toBe("fk_deckkey");
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
    expect(req.keyScope).toBe("full");
  });

  test("missing header errors", async () => {
    const { err } = await run(undefined);
    expect(err).toBeTruthy();
  });
});

describe("requireFullScope", () => {
  function scope(keyScope?: "full" | "deck") {
    const req = { keyScope } as Request;
    return new Promise<unknown>((resolve) => {
      requireFullScope(req, {} as Response, (err?: unknown) => resolve(err));
    });
  }

  test("blocks deck-scoped keys", async () => {
    expect(await scope("deck")).toBeTruthy();
  });

  test("allows full-scope keys", async () => {
    expect(await scope("full")).toBeUndefined();
  });

  test("allows JWT requests (no keyScope set to deck)", async () => {
    expect(await scope(undefined)).toBeUndefined();
  });
});

describe("requireVerified", () => {
  function verify(userId?: string) {
    const req = { userId } as Request;
    return new Promise<unknown>((resolve) => {
      requireVerified(req, {} as Response, (err?: unknown) => resolve(err));
    });
  }

  test("allows a verified account", async () => {
    mockAuth.getCurrentUser.mockResolvedValue({
      emailVerifiedAt: "2026-07-18T12:00:00.000Z",
    } as never);

    expect(await verify("user-123")).toBeUndefined();
  });

  test("blocks an unverified account with a specific error", async () => {
    mockAuth.getCurrentUser.mockResolvedValue({
      emailVerifiedAt: null,
    } as never);

    const error = await verify("user-123");
    expect(error).toMatchObject({
      code: "EMAIL_VERIFICATION_REQUIRED",
      httpStatus: 403,
    });
  });

  test("rejects a request without an authenticated user", async () => {
    expect(await verify()).toMatchObject({ code: "UNAUTHENTICATED" });
    expect(mockAuth.getCurrentUser).not.toHaveBeenCalled();
  });

  test("forwards account lookup failures", async () => {
    const lookupError = new Error("database unavailable");
    mockAuth.getCurrentUser.mockRejectedValue(lookupError);

    expect(await verify("user-123")).toBe(lookupError);
  });
});
