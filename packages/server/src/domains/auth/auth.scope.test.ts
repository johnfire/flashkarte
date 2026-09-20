import request from "supertest";

jest.mock("../keys/keys.service");
jest.mock("../../db/client", () => ({
  getPool: jest.fn(),
  query: jest.fn(),
  queryOne: jest.fn(),
  closePool: jest.fn(),
}));

import * as keys from "../keys/keys.service";
import { createApp } from "../../app";

/**
 * A deck-scoped key (what an AI authoring key, or the key the MCP connector holds, is) exists so an AI
 * can build decks and lessons. It must not be able to read the person's profile or change account
 * settings, whatever else it can reach. These use the real auth middleware, so they fail if a route
 * loses its scope check.
 */
const mockKeys = keys as jest.Mocked<typeof keys>;
const DECK_KEY = `fk_${"d".repeat(64)}`;
const FULL_KEY = `fk_${"f".repeat(64)}`;
const app = createApp();

beforeEach(() => {
  jest.clearAllMocks();
  mockKeys.resolveKey.mockImplementation(async (raw: string) => {
    if (raw === DECK_KEY) {
      return { userId: "u1", scope: "deck", keyPrefix: "fk_dddddddd" };
    }
    if (raw === FULL_KEY) {
      return { userId: "u1", scope: "full", keyPrefix: "fk_ffffffff" };
    }
    return null;
  });
});

const ACCOUNT_ROUTES: ["get" | "patch" | "post" | "delete", string][] = [
  ["get", "/api/auth/me"],
  ["patch", "/api/auth/me"],
  ["post", "/api/auth/resend-verification"],
  ["post", "/api/auth/change-password"],
  ["post", "/api/auth/change-email"],
  ["delete", "/api/auth/account"],
];

describe("account routes and deck-scoped keys", () => {
  test.each(ACCOUNT_ROUTES)(
    "an AI (deck-scoped) key is refused on %s %s",
    async (method, path) => {
      const call = request(app)[method](path);
      const res = await call
        .set("Authorization", `Bearer ${DECK_KEY}`)
        .send({});
      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/limited to deck operations/);
    },
  );

  test.each(ACCOUNT_ROUTES)(
    "a full-scope key gets past the scope check on %s %s",
    async (method, path) => {
      const call = request(app)[method](path);
      const res = await call
        .set("Authorization", `Bearer ${FULL_KEY}`)
        .send({});
      expect(res.status).not.toBe(403);
    },
  );
});
