import nodemailer, { Transporter } from "nodemailer";
import { logger } from "../utils/logger";

// Email sending. SMTP is configured via env (MAIL_HOST/PORT/USER/PASS/FROM).
// When MAIL_HOST is unset (local dev, tests, CI) we don't send — we log the
// message instead, so flows work end-to-end without a mail server.

let transporter: Transporter | null = null;
let initialized = false;

function getTransporter(): Transporter | null {
  if (initialized) return transporter;
  initialized = true;
  const host = process.env.MAIL_HOST;
  if (!host) return (transporter = null);
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.MAIL_PORT ?? "587", 10),
    secure: process.env.MAIL_SECURE === "true", // 587 uses STARTTLS => false
    auth: process.env.MAIL_USER
      ? { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS }
      : undefined,
  });
  return transporter;
}

/** Public base URL of the web app, used to build links in emails. */
export function getAppUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:8090").replace(/\/+$/, "");
}

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(mail: Mail): Promise<void> {
  const from =
    process.env.MAIL_FROM ?? "flashkarte <contact@christopherrehm.de>";
  // Test sink: append outbound mail as JSON lines so E2E tests can read
  // verification/reset links without a real SMTP server. Never set in prod.
  const sinkPath = process.env.MAIL_FILE_SINK;
  if (sinkPath) {
    const fs = await import("fs");
    fs.appendFileSync(sinkPath, JSON.stringify(mail) + "\n");
    return;
  }
  const tx = getTransporter();
  if (!tx) {
    logger.info("email.mailer", "smtp not configured; message skipped", {
      subject: mail.subject,
    });
    return;
  }
  await tx.sendMail({ from, ...mail });
}

function layout(
  heading: string,
  body: string,
  cta: string,
  link: string,
): string {
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111">
  <h2 style="color:#4F46E5">${heading}</h2>
  <p>${body}</p>
  <p><a href="${link}" style="display:inline-block;background:#4F46E5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px">${cta}</a></p>
  <p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${link}</p>
</div>`;
}

export async function sendVerificationEmail(
  to: string,
  link: string,
): Promise<void> {
  await sendMail({
    to,
    subject: "Verify your flashkarte email",
    text: `Welcome to flashkarte! Confirm your email address by opening this link:\n${link}\n\nThis link expires in 24 hours.`,
    html: layout(
      "Confirm your email",
      "Welcome to flashkarte! Please confirm your email address. This link expires in 24 hours.",
      "Verify email",
      link,
    ),
  });
}

export async function sendEmailChangeVerification(
  to: string,
  link: string,
): Promise<void> {
  await sendMail({
    to,
    subject: "Confirm your new flashkarte email",
    text: `Confirm this email address for your flashkarte account by opening this link:\n${link}\n\nThis link expires in 24 hours. If you did not request this change, you can ignore this email.`,
    html: layout(
      "Confirm your new email",
      "Confirm this email address for your flashkarte account. This link expires in 24 hours. If you did not request it, you can safely ignore this email.",
      "Confirm email",
      link,
    ),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  link: string,
): Promise<void> {
  await sendMail({
    to,
    subject: "Reset your flashkarte password",
    text: `Someone requested a password reset for your flashkarte account. Open this link to choose a new password:\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: layout(
      "Reset your password",
      "Someone requested a password reset for your flashkarte account. This link expires in 1 hour. If you didn't request this, you can safely ignore this email.",
      "Reset password",
      link,
    ),
  });
}
