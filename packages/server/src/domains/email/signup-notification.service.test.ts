jest.mock("./signup-notification.repository");
jest.mock("../audit/audit.service");

import type { PoolClient } from "pg";
import { insertSignupNotification } from "./signup-notification.repository";
import { recordRequired, userActor } from "../audit/audit.service";
import {
  queueSignupNotification,
  renderSignupNotification,
} from "./signup-notification.service";

const CLIENT = {} as PoolClient;
const USER = {
  id: "user-1",
  email: "new@example.com",
  created_at: new Date("2026-10-02T12:34:56Z"),
};
const savedRecipient = process.env.SIGNUP_NOTIFICATION_EMAIL;

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.SIGNUP_NOTIFICATION_EMAIL;
  jest.mocked(insertSignupNotification).mockResolvedValue("campaign-1");
  jest.mocked(userActor).mockReturnValue({ type: "user", id: USER.id });
});
afterAll(() => {
  if (savedRecipient === undefined)
    delete process.env.SIGNUP_NOTIFICATION_EMAIL;
  else process.env.SIGNUP_NOTIFICATION_EMAIL = savedRecipient;
});

test("renders only the signup facts, with escaped HTML", () => {
  const message = renderSignupNotification({
    ...USER,
    email: "<new>&@example.com",
  });
  expect(message.subject).toBe("LearnWohl — new user signup");
  expect(message.textBody).toContain(USER.id);
  expect(message.textBody).toContain("2026-10-02T12:34:56.000Z");
  expect(message.textBody).toContain("pending at signup");
  expect(message.htmlBody).toContain("&lt;new&gt;&amp;@example.com");
  expect(message.htmlBody).not.toContain("<new>");
  expect(message.htmlBody).toContain("administrator notification");
  expect(message.htmlBody).not.toContain(
    "because you have a flashkarte account",
  );
});

test("queues the requested destination and records a transactional audit", async () => {
  await queueSignupNotification(CLIENT, USER);
  expect(insertSignupNotification).toHaveBeenCalledWith(
    CLIENT,
    expect.objectContaining({
      userId: USER.id,
      recipientEmail: "chris@christopherrehm.de",
      subject: "LearnWohl — new user signup",
    }),
  );
  expect(recordRequired).toHaveBeenCalledWith(
    expect.objectContaining({
      actor: { type: "user", id: USER.id },
      action: "email.signup_notification_queued",
      targetId: "campaign-1",
    }),
    CLIENT,
  );
});

test("does not enqueue when disabled", async () => {
  process.env.SIGNUP_NOTIFICATION_EMAIL = "";
  await queueSignupNotification(CLIENT, USER);
  expect(insertSignupNotification).not.toHaveBeenCalled();
  expect(recordRequired).not.toHaveBeenCalled();
});

test("does not record a second event for a duplicate enqueue", async () => {
  jest.mocked(insertSignupNotification).mockResolvedValue(null);
  await queueSignupNotification(CLIENT, USER);
  expect(recordRequired).not.toHaveBeenCalled();
});

test("propagates storage failure so the signup transaction rolls back", async () => {
  jest
    .mocked(insertSignupNotification)
    .mockRejectedValue(new Error("queue unavailable"));
  await expect(queueSignupNotification(CLIENT, USER)).rejects.toThrow(
    "queue unavailable",
  );
  expect(recordRequired).not.toHaveBeenCalled();
});
