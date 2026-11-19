import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext } from "@playwright/test";

export const MAIL_SINK = path.join(__dirname, ".artifacts", "mail-sink.jsonl");
const verificationUrl = /https?:\/\/\S+verify-email\S+/;

function localVerificationLink(email: string): string | undefined {
  const messages = readFileSync(MAIL_SINK, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { to: string; text: string });
  return messages
    .findLast((message) => message.to === email)
    ?.text.match(verificationUrl)?.[0];
}

async function capturedVerificationLink(
  request: APIRequestContext,
  inbox: string,
  email: string,
): Promise<string | undefined> {
  const search = await request.get(`${inbox}/api/v1/search`, {
    params: { query: `to:${email}` },
  });
  expect(search.ok()).toBeTruthy();
  const matches: { messages: Array<{ ID: string }> } = await search.json();
  for (const message of matches.messages) {
    const fetched = await request.get(`${inbox}/api/v1/message/${message.ID}`);
    expect(fetched.ok()).toBeTruthy();
    const body: { Text: string } = await fetched.json();
    const link = body.Text.match(verificationUrl)?.[0];
    if (link) return link;
  }
}

export async function verificationLink(
  request: APIRequestContext,
  email: string,
  baseUrl?: string,
): Promise<string> {
  const inbox = process.env.STAGING_MAIL_URL;
  let link: string | undefined;
  if (inbox) {
    await expect(async () => {
      link = await capturedVerificationLink(request, inbox, email);
      expect(
        link,
        "verification link present in the captured mail",
      ).toBeTruthy();
    }).toPass({ timeout: 15_000 });
  } else {
    link = localVerificationLink(email);
  }
  if (!link || !baseUrl)
    throw new Error("Expected a verification link and test site URL");
  expect(new URL(link).origin).toBe(new URL(baseUrl).origin);
  return link;
}
