jest.mock("../../db/client", () => ({
  withTransaction: jest.fn(),
}));
jest.mock("./email.repository");
jest.mock("../../email/mailer", () => ({
  sendMail: jest.fn(),
}));

import { withTransaction } from "../../db/client";
import * as mailer from "../../email/mailer";
import * as repository from "./email.repository";
import {
  contactUsers,
  processNextDelivery,
  renderMessageHtml,
} from "./email.service";
import type { EligibleRecipient } from "./email.types";

const transactionMock = withTransaction as jest.MockedFunction<
  typeof withTransaction
>;
const repositoryMock = repository as jest.Mocked<typeof repository>;
const mailerMock = mailer as jest.Mocked<typeof mailer>;

const RECIPIENTS: EligibleRecipient[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    email: "a@example.com",
    displayName: null,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    email: "b@example.com",
    displayName: "B",
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  transactionMock.mockImplementation(async (callback) => callback({} as never));
  repositoryMock.findEligibleRecipients.mockResolvedValue(RECIPIENTS);
  repositoryMock.createCampaign.mockResolvedValue({
    id: "33333333-3333-4333-8333-333333333333",
    status: "queued",
    recipientCount: 2,
    sentCount: 0,
    failedCount: 0,
    createdAt: "2026-09-30T00:00:00.000Z",
  });
  repositoryMock.createDeliveries.mockResolvedValue();
  repositoryMock.claimNextDelivery.mockResolvedValue(null);
  mailerMock.sendMail.mockResolvedValue({
    accepted: true,
    messageId: "smtp-1",
  });
});

describe("renderMessageHtml", () => {
  test("escapes user content and preserves paragraphs", () => {
    const html = renderMessageHtml("Hello <user>\nline two\n\nNext");

    expect(html).toContain("Hello &lt;user&gt;<br>line two");
    expect(html).toContain("<p>Next</p>");
    expect(html).not.toContain("<user>");
  });
  test("escapes a custom footer", () => {
    expect(renderMessageHtml("Body", "Admin <notice>")).toContain(
      "Admin &lt;notice&gt;",
    );
  });
});

describe("contactUsers", () => {
  test("creates a queued campaign and one delivery per verified recipient", async () => {
    const campaign = await contactUsers(
      "44444444-4444-4444-8444-444444444444",
      "Important update",
      "The service will be unavailable tonight.",
      RECIPIENTS.map((recipient) => recipient.id),
    );

    expect(campaign.status).toBe("queued");
    expect(repositoryMock.createCampaign).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        createdBy: "44444444-4444-4444-8444-444444444444",
        recipientCount: 2,
      }),
    );
    expect(repositoryMock.createDeliveries).toHaveBeenCalledWith(
      expect.anything(),
      campaign.id,
      RECIPIENTS,
    );
  });

  test("rejects an empty recipient selection", async () => {
    await expect(
      contactUsers(
        "44444444-4444-4444-8444-444444444444",
        "Subject",
        "Body",
        [],
      ),
    ).rejects.toThrow("Select at least one verified user");
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test("rejects a selection containing an unverified user", async () => {
    repositoryMock.findEligibleRecipients.mockResolvedValue([RECIPIENTS[0]]);

    await expect(
      contactUsers(
        "44444444-4444-4444-8444-444444444444",
        "Subject",
        "Body",
        RECIPIENTS.map((recipient) => recipient.id),
      ),
    ).rejects.toThrow(
      "Every selected recipient must be an existing, verified user",
    );
    expect(repositoryMock.createCampaign).not.toHaveBeenCalled();
  });
});

describe("processNextDelivery", () => {
  test("sends a claimed delivery and records SMTP acceptance", async () => {
    repositoryMock.claimNextDelivery.mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      campaignId: "33333333-3333-4333-8333-333333333333",
      recipientEmail: "a@example.com",
      recipientName: null,
      subject: "Subject",
      textBody: "Body",
      htmlBody: "<p>Body</p>",
      attemptCount: 1,
    });

    await expect(processNextDelivery("worker-a")).resolves.toBe(true);

    expect(mailerMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@example.com",
        subject: "Subject",
        messageId: "<55555555-5555-4555-8555-555555555555@flashkarte.local>",
      }),
    );
    expect(repositoryMock.markDeliverySent).toHaveBeenCalledWith(
      "55555555-5555-4555-8555-555555555555",
      "33333333-3333-4333-8333-333333333333",
      "smtp-1",
    );
  });

  test("records a failed delivery when SMTP rejects it", async () => {
    repositoryMock.claimNextDelivery.mockResolvedValue({
      id: "55555555-5555-4555-8555-555555555555",
      campaignId: "33333333-3333-4333-8333-333333333333",
      recipientEmail: "a@example.com",
      recipientName: null,
      subject: "Subject",
      textBody: "Body",
      htmlBody: "<p>Body</p>",
      attemptCount: 2,
    });
    mailerMock.sendMail.mockResolvedValue({
      accepted: false,
      reason: "SMTP rejected the recipient",
    });

    await expect(processNextDelivery("worker-a")).resolves.toBe(true);

    expect(repositoryMock.markDeliveryFailed).toHaveBeenCalledWith(
      "55555555-5555-4555-8555-555555555555",
      "33333333-3333-4333-8333-333333333333",
      2,
      "SMTP rejected the recipient",
    );
  });
});
