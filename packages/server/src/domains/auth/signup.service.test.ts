jest.mock("../../db/client");
jest.mock("./auth.repository");
jest.mock("../email/signup-notification.service");
jest.mock("../../email/mailer");
jest.mock("bcryptjs");
jest.mock("../promos/promo-signup.service", () => ({
  ...jest.requireActual("../promos/promo-signup.service"),
  activateSignupPromo: jest.fn(),
}));

import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { withTransaction } from "../../db/client";
import { sendVerificationEmail } from "../../email/mailer";
import { queueSignupNotification } from "../email/signup-notification.service";
import * as repository from "./auth.repository";
import { signup } from "./auth.service";
import { activateSignupPromo } from "../promos/promo-signup.service";

const CLIENT = {} as PoolClient;
const USER = {
  id: "signup-user",
  email: "new@example.com",
  role: "user",
  account_type: "free",
  email_verified_at: null,
  display_name: null,
  language: null,
  two_factor_enabled: false,
  speech_enabled: false,
  speech_lang: null,
  speech_autoplay: "off",
  speech_rate: 1,
  is_deletion_protected: false,
  created_at: new Date("2026-10-02T12:34:56Z"),
};

beforeEach(() => {
  jest.resetAllMocks();
  jest
    .mocked(withTransaction)
    .mockImplementation(async (callback) => callback(CLIENT));
  jest.mocked(repository.findByEmailWithHash).mockResolvedValue(null);
  jest.mocked(repository.createUser).mockResolvedValue(USER);
  jest
    .mocked(repository.storeRefreshToken)
    .mockResolvedValue({ id: "session-1" } as never);
  jest.mocked(bcrypt.hash).mockImplementation(async () => "password-hash");
});

test("creates the account, session and notification in the same transaction", async () => {
  const registration = await signup(USER.email, "StrongPassword-1");
  expect(registration.user.id).toBe(USER.id);
  expect(repository.createUser).toHaveBeenCalledWith(
    USER.email,
    "password-hash",
    CLIENT,
  );
  expect(repository.storeRefreshToken).toHaveBeenCalledWith(
    USER.id,
    expect.any(String),
    expect.any(Date),
    true,
    CLIENT,
  );
  expect(queueSignupNotification).toHaveBeenCalledWith(CLIENT, USER);
  expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
});

test("a rejected duplicate signup never queues an alert", async () => {
  jest
    .mocked(repository.findByEmailWithHash)
    .mockResolvedValue({ ...USER, password_hash: "existing" });
  await expect(signup(USER.email, "StrongPassword-1")).rejects.toThrow(
    "already exists",
  );
  expect(withTransaction).not.toHaveBeenCalled();
  expect(queueSignupNotification).not.toHaveBeenCalled();
});

test("invalid credentials never queue an alert", async () => {
  await expect(signup("bad-email", "short")).rejects.toThrow();
  expect(withTransaction).not.toHaveBeenCalled();
  expect(queueSignupNotification).not.toHaveBeenCalled();
});

test("verification SMTP failure does not undo a signup or its queued alert", async () => {
  jest
    .mocked(sendVerificationEmail)
    .mockRejectedValue(new Error("SMTP unavailable"));
  await expect(signup(USER.email, "StrongPassword-1")).resolves.toMatchObject({
    user: { id: USER.id },
  });
  expect(queueSignupNotification).toHaveBeenCalledTimes(1);
});

test("queue storage failure rejects before sending verification", async () => {
  jest
    .mocked(queueSignupNotification)
    .mockRejectedValue(new Error("queue unavailable"));
  await expect(signup(USER.email, "StrongPassword-1")).rejects.toThrow(
    "queue unavailable",
  );
  expect(sendVerificationEmail).not.toHaveBeenCalled();
});

test("activates a normalized promo in the account transaction", async () => {
  await signup(USER.email, "StrongPassword-1", " free30 ", "free");
  expect(activateSignupPromo).toHaveBeenCalledWith(
    CLIENT,
    USER.id,
    "FREE30",
    "free",
  );
  expect(queueSignupNotification).toHaveBeenCalledTimes(1);
});

test("invalid promo prevents issuing a session or notification", async () => {
  jest
    .mocked(activateSignupPromo)
    .mockRejectedValue(new Error("Promo code is fully used"));
  await expect(
    signup(USER.email, "StrongPassword-1", "FREE30", "free"),
  ).rejects.toThrow("fully used");
  expect(repository.storeRefreshToken).not.toHaveBeenCalled();
  expect(queueSignupNotification).not.toHaveBeenCalled();
  expect(sendVerificationEmail).not.toHaveBeenCalled();
});
