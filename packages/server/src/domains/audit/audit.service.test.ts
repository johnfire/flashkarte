jest.mock("./audit.repository");
jest.mock("../../utils/logger");

import type { Request } from "express";
import { insertAuditLog } from "./audit.repository";
import { record, actorFromRequest, userActor } from "./audit.service";

const mockInsert = insertAuditLog as jest.MockedFunction<typeof insertAuditLog>;

describe("audit.service", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("actorFromRequest", () => {
    it("returns user actor when authenticated with a JWT", () => {
      const req = { userId: "u1" } as Request;
      expect(actorFromRequest(req)).toEqual({ type: "user", id: "u1" });
    });

    it("returns an ai-agent actor when authenticated with a deck-scoped key", () => {
      const req = {
        userId: "u1",
        keyScope: "deck" as const,
        keyPrefix: "fk_abcd1234",
      } as unknown as Request;
      expect(actorFromRequest(req)).toEqual({
        type: "ai-agent",
        id: "ai-agent:fk_abcd1234",
      });
    });

    it("throws for fully unauthenticated requests", () => {
      const req = {} as Request;
      expect(() => actorFromRequest(req)).toThrow(/Cannot derive audit actor/);
    });
  });

  describe("record", () => {
    it("writes a success audit entry with the right actor/action/target", async () => {
      mockInsert.mockResolvedValue([]);
      const actor = userActor("u1");
      await record({
        actor,
        action: "deck.created",
        targetType: "deck",
        targetId: "d1",
        afterState: { title: "T" },
      });
      expect(mockInsert).toHaveBeenCalledTimes(1);
      const args = mockInsert.mock.calls[0];
      expect(args[0]).toMatchObject({
        actorType: "user",
        actorId: "u1",
        action: "deck.created",
        targetType: "deck",
        targetId: "d1",
        outcome: "success",
      });
      expect(args[0].afterState).toEqual({ title: "T" });
    });

    it("includes failure outcome when provided", async () => {
      mockInsert.mockResolvedValue([]);
      await record({
        actor: userActor("u1"),
        action: "deck.deleted",
        outcome: "failure",
      });
      expect(mockInsert.mock.calls[0][0].outcome).toBe("failure");
    });

    it("passes through an optional transaction client", async () => {
      mockInsert.mockResolvedValue([]);
      const client = { query: jest.fn() } as unknown as import("pg").PoolClient;
      await record(
        {
          actor: userActor("u1"),
          action: "account.deleted",
        },
        client,
      );
      expect(mockInsert).toHaveBeenCalledWith(expect.any(Object), client);
    });

    it("swallows insert failures on the best-effort pool path", async () => {
      mockInsert.mockRejectedValue(new Error("db down"));
      await expect(
        record({ actor: userActor("u1"), action: "deck.created" }),
      ).resolves.toBeUndefined();
    });

    it("rethrows insert failures when a transaction client is passed", async () => {
      mockInsert.mockRejectedValue(new Error("db down"));
      const client = { query: jest.fn() } as unknown as import("pg").PoolClient;
      await expect(
        record({ actor: userActor("u1"), action: "account.deleted" }, client),
      ).rejects.toThrow("db down");
    });
  });
});
