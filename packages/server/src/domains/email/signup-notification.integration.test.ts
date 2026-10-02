jest.mock("../../email/mailer", () => ({
  sendMail: jest.fn(),
  sendVerificationEmail: jest.fn(),
  getAppUrl: () => "https://learnwohl.example",
}));

import request from "supertest";
import { createApp } from "../../app";
import { closePool, getPool, withTransaction } from "../../db/client";
import { runMigrations } from "../../db/migrate";
import { sendMail, sendVerificationEmail } from "../../email/mailer";
import { getCorrelationId } from "../../utils/logger";
import { verifyEmail } from "../auth/auth.service";
import { processNextDelivery } from "./email.service";
import { queueSignupNotification } from "./signup-notification.service";
import * as notificationRepository from "./signup-notification.repository";

const APP = createApp();
const EMAIL = "signup-notification-user@example.com";
const OWNER_EMAIL = "signup-notification-owner@example.com";
const savedRecipient = process.env.SIGNUP_NOTIFICATION_EMAIL;

beforeAll(async () => {
  if (!(process.env.POSTGRES_DB ?? "").endsWith("_test")) {
    throw new Error(
      "Signup notification integration tests require POSTGRES_DB ending in _test",
    );
  }
  await runMigrations();
});

beforeEach(async () => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  process.env.SIGNUP_NOTIFICATION_EMAIL = OWNER_EMAIL;
  jest
    .mocked(sendMail)
    .mockResolvedValue({ accepted: true, messageId: "smtp-test" });
  await getPool().query("DELETE FROM email_campaigns");
  await getPool().query("DELETE FROM users WHERE email = $1", [EMAIL]);
});

afterAll(async () => {
  if (savedRecipient === undefined)
    delete process.env.SIGNUP_NOTIFICATION_EMAIL;
  else process.env.SIGNUP_NOTIFICATION_EMAIL = savedRecipient;
  await closePool();
});

function register(email = EMAIL, password = "StrongPassword-1") {
  return request(APP).post("/api/auth/signup").send({ email, password });
}

async function queuedAlerts() {
  const alerts = await getPool().query(
    `SELECT c.id, c.event_key, c.correlation_id, c.status, c.text_body, c.html_body,
       d.recipient_email, d.user_id, d.state, d.attempt_count, d.next_attempt_at
     FROM email_campaigns c JOIN email_deliveries d ON d.campaign_id = c.id
     WHERE c.category = 'signup_notification'`,
  );
  return alerts.rows;
}

test("HTTP signup queues an unverified account alert and the worker delivers it once", async () => {
  const registration = await register();
  expect(registration.status).toBe(201);
  expect(registration.body.user.emailVerifiedAt).toBeNull();
  const [alert] = await queuedAlerts();
  expect(alert).toMatchObject({
    event_key: `signup:${registration.body.user.id}`,
    recipient_email: OWNER_EMAIL,
    user_id: null,
    state: "pending",
    attempt_count: 0,
    correlation_id: registration.headers["x-request-id"],
  });
  expect(alert.text_body).toContain(EMAIL);
  expect(alert.text_body).toContain("pending at signup");
  expect(alert.text_body).not.toContain("StrongPassword-1");
  const audits = await getPool().query(
    "SELECT actor_id, correlation_id FROM audit_log WHERE action = 'email.signup_notification_queued' AND target_id = $1",
    [alert.id],
  );
  expect(audits.rows[0]).toMatchObject({
    actor_id: registration.body.user.id,
    correlation_id: registration.headers["x-request-id"],
  });
  expect(sendMail).not.toHaveBeenCalled();
  jest.mocked(sendMail).mockImplementationOnce(async () => {
    expect(getCorrelationId()).toBe(registration.headers["x-request-id"]);
    return { accepted: true, messageId: "smtp-test" };
  });
  await expect(processNextDelivery("signup-worker")).resolves.toBe(true);
  expect(sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: OWNER_EMAIL,
      subject: "LearnWohl — new user signup",
      text: alert.text_body,
    }),
  );
  expect((await queuedAlerts())[0]).toMatchObject({
    state: "sent",
    status: "completed",
  });
  await expect(processNextDelivery("signup-worker")).resolves.toBe(false);
  expect(sendMail).toHaveBeenCalledTimes(1);
});

test("failed and duplicate signup, login and verification do not create more alerts", async () => {
  expect((await register(EMAIL, "short")).status).toBe(422);
  expect(await queuedAlerts()).toHaveLength(0);
  expect((await register()).status).toBe(201);
  expect((await register()).status).toBe(422);
  const login = await request(APP)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: "StrongPassword-1" });
  expect(login.status).toBe(200);
  const verificationLink = jest.mocked(sendVerificationEmail).mock.calls[0][1];
  const token = new URL(verificationLink).searchParams.get("token");
  await verifyEmail(token);
  expect(await queuedAlerts()).toHaveLength(1);
});

test("concurrent enqueue attempts preserve one event and one delivery", async () => {
  const registration = await register();
  const accounts = await getPool().query(
    "SELECT id, email, created_at FROM users WHERE id = $1",
    [registration.body.user.id],
  );
  await Promise.all(
    Array.from({ length: 4 }, () =>
      withTransaction((client) =>
        queueSignupNotification(client, accounts.rows[0]),
      ),
    ),
  );
  expect(await queuedAlerts()).toHaveLength(1);
});

test("SMTP failure leaves the account usable and retries with the same message identity", async () => {
  expect((await register()).status).toBe(201);
  jest.mocked(sendMail).mockRejectedValueOnce(new Error("SMTP unavailable"));
  await processNextDelivery("signup-worker");
  const [alert] = await queuedAlerts();
  expect(alert).toMatchObject({ state: "pending", attempt_count: 1 });
  expect(alert.next_attempt_at.getTime()).toBeGreaterThan(Date.now());
  expect(
    (
      await request(APP)
        .post("/api/auth/login")
        .send({ email: EMAIL, password: "StrongPassword-1" })
    ).status,
  ).toBe(200);
  await getPool().query(
    "UPDATE email_deliveries SET next_attempt_at = now() WHERE campaign_id = $1",
    [alert.id],
  );
  await processNextDelivery("signup-worker");
  expect((await queuedAlerts())[0]).toMatchObject({
    state: "sent",
    status: "completed",
    attempt_count: 2,
  });
  expect(jest.mocked(sendMail).mock.calls[0][0].messageId).toBe(
    jest.mocked(sendMail).mock.calls[1][0].messageId,
  );
});

test("exhausted SMTP retries retain a visible failed delivery", async () => {
  await register();
  jest
    .mocked(sendMail)
    .mockResolvedValue({ accepted: false, reason: "SMTP rejected recipient" });
  for (let attempt = 0; attempt < 5; attempt++) {
    await getPool().query(
      "UPDATE email_deliveries SET next_attempt_at = now()",
    );
    await processNextDelivery("signup-worker");
  }
  expect((await queuedAlerts())[0]).toMatchObject({
    state: "failed",
    status: "failed",
    attempt_count: 5,
  });
  await expect(processNextDelivery("signup-worker")).resolves.toBe(false);
});

test("queue storage failure rolls back the actual account and session", async () => {
  jest
    .spyOn(notificationRepository, "insertSignupNotification")
    .mockRejectedValueOnce(new Error("queue unavailable"));
  expect((await register()).status).toBe(500);
  expect(
    (await getPool().query("SELECT id FROM users WHERE email = $1", [EMAIL]))
      .rows,
  ).toHaveLength(0);
  expect(await queuedAlerts()).toHaveLength(0);
  expect(sendVerificationEmail).not.toHaveBeenCalled();
});

test("explicit disabling still permits signup without any owner alert", async () => {
  process.env.SIGNUP_NOTIFICATION_EMAIL = "";
  expect((await register()).status).toBe(201);
  expect(await queuedAlerts()).toHaveLength(0);
  expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
});

test("signup alerts take priority over an older bulk announcement", async () => {
  await register();
  const campaigns = await getPool().query(
    `INSERT INTO email_campaigns (subject, text_body, html_body, recipient_count)
     VALUES ('Older announcement', 'Body', '<p>Body</p>', 1) RETURNING id`,
  );
  await getPool().query(
    `INSERT INTO email_deliveries (campaign_id, recipient_email, created_at)
     VALUES ($1, 'announcement@example.com', now() - interval '1 day')`,
    [campaigns.rows[0].id],
  );
  await processNextDelivery("signup-worker");
  expect(sendMail).toHaveBeenCalledWith(
    expect.objectContaining({
      to: OWNER_EMAIL,
      subject: "LearnWohl — new user signup",
    }),
  );
});
