jest.mock("../../db/client");
jest.mock("../audit/audit.service");
jest.mock("./auth.repository");
jest.mock("bcryptjs");

import bcrypt from "bcryptjs";
import { withTransaction } from "../../db/client";
import { record, userActor } from "../audit/audit.service";
import * as repo from "./auth.repository";
import { deleteAccount } from "./auth.service";

const mockRepo = repo as jest.Mocked<typeof repo>;
const mockAudit = { record, userActor } as {
  record: jest.MockedFunction<typeof record>;
  userActor: jest.MockedFunction<typeof userActor>;
};
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

function setupRepoRow(
  overrides: Partial<{
    id: string;
    email: string;
    password_hash: string;
  }> = {},
) {
  const row = {
    id: overrides.id ?? "u1",
    email: overrides.email ?? "a@b.com",
    role: "user",
    account_type: "free",
    email_verified_at: null,
    display_name: null,
    language: null,
    password_hash: overrides.password_hash ?? "$2a$12$hashhashhash",
  };
  mockRepo.findByIdWithHash.mockResolvedValue(row);
  return row;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAudit.userActor.mockReturnValue({ type: "user", id: "u1" });
  mockBcrypt.compare.mockResolvedValue(true as never);
  mockAudit.record.mockResolvedValue(undefined);
  mockRepo.deleteUserAccount.mockResolvedValue([]);
  // withTransaction calls the callback with a mock client
  const mockClient = { query: jest.fn() } as unknown as import("pg").PoolClient;
  (withTransaction as jest.Mock).mockImplementation(
    async (fn: (client: unknown) => Promise<void>) => fn(mockClient),
  );
});

describe("deleteAccount", () => {
  it("rejects when current password is missing", async () => {
    setupRepoRow();
    await expect(deleteAccount("u1", undefined)).rejects.toThrow(
      "Current password is required",
    );
  });

  it("rejects when current password is wrong", async () => {
    setupRepoRow();
    mockBcrypt.compare.mockResolvedValue(false as never);
    await expect(deleteAccount("u1", "wrong")).rejects.toThrow(
      "Current password is incorrect",
    );
  });

  it("rejects when user not found", async () => {
    mockRepo.findByIdWithHash.mockResolvedValue(null);
    await expect(deleteAccount("nope", "password")).rejects.toThrow(
      "Not found",
    );
  });

  it("writes audit entry and deletes user + review_events in a transaction", async () => {
    setupRepoRow();
    (withTransaction as jest.Mock).mockImplementation(
      async (fn: (c: unknown) => Promise<void>) => {
        const client = { query: jest.fn() };
        await fn(client);
      },
    );

    await deleteAccount("u1", "password");

    expect(withTransaction).toHaveBeenCalledTimes(1);
    expect(mockAudit.record).toHaveBeenCalledTimes(1);
    expect(mockAudit.record.mock.calls[0][0]).toMatchObject({
      actor: { type: "user", id: "u1" },
      action: "account.deleted",
      targetType: "user",
      targetId: "u1",
    });
    // The audit record was passed a client (the same transaction)
    expect(mockAudit.record.mock.calls[0][1]).toBeDefined();
    expect(mockRepo.deleteUserAccount).toHaveBeenCalledWith(
      "u1",
      expect.any(Object),
    );
  });

  it("does not write before_state (no PII in audit)", async () => {
    setupRepoRow();

    await deleteAccount("u1", "password");

    const params = mockAudit.record.mock.calls[0][0];
    expect(params.beforeState).toBeUndefined();
    expect(params.afterState).toBeUndefined();
  });
});