import crypto from "crypto";
import fs from "fs";
import { BillingConfigurationError } from "../../utils/errors";
import type {
  BillingPlan,
  BillingStatus,
  SubscriptionInput,
} from "./billing.repository";
import * as repository from "./billing.repository";

interface GoogleCredentials {
  client_email: string;
  private_key: string;
}

interface GoogleSubscription {
  subscriptionState?: string;
  startTime?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    offerDetails?: { basePlanId?: string };
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }>;
}

function config(): { packageName: string; credentials: GoogleCredentials } {
  const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME;
  const file = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_FILE;
  if (!packageName || !file) {
    throw new BillingConfigurationError(
      "GOOGLE_PLAY_PACKAGE_NAME and GOOGLE_PLAY_SERVICE_ACCOUNT_FILE are required",
    );
  }
  const credentials = JSON.parse(
    fs.readFileSync(file, "utf8"),
  ) as GoogleCredentials;
  if (!credentials.client_email || !credentials.private_key) {
    throw new BillingConfigurationError(
      "Google Play service-account JSON is invalid",
    );
  }
  return { packageName, credentials };
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

async function accessToken(credentials: GoogleCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsigned)
    .sign(credentials.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const body = (await response.json()) as { access_token?: string };
  if (!response.ok || !body.access_token) {
    throw new Error("Google Play authentication failed");
  }
  return body.access_token;
}

async function acknowledgePurchase(
  packageName: string,
  productId: string,
  purchaseToken: string,
  token: string,
): Promise<void> {
  const endpoint =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptions/` +
    `${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  if (!response.ok && response.status !== 409) {
    throw new Error("Google Play purchase acknowledgement failed");
  }
}

function planForBasePlan(basePlanId: string | undefined): BillingPlan {
  if (basePlanId === process.env.GOOGLE_PLAY_YEARLY_BASE_PLAN_ID)
    return "yearly";
  if (basePlanId === process.env.GOOGLE_PLAY_MONTHLY_BASE_PLAN_ID)
    return "monthly";
  throw new BillingConfigurationError(
    "Unknown Google Play subscription base plan",
  );
}

function status(value: string | undefined): BillingStatus {
  switch (value) {
    case "SUBSCRIPTION_STATE_ACTIVE":
      return "active";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
      return "grace_period";
    case "SUBSCRIPTION_STATE_ON_HOLD":
      return "on_hold";
    case "SUBSCRIPTION_STATE_CANCELED":
      return "canceled";
    case "SUBSCRIPTION_STATE_PENDING":
      return "pending";
    default:
      return "expired";
  }
}

export async function verifyPurchase(
  userId: string,
  purchaseToken: string,
): Promise<void> {
  const { packageName, credentials } = config();
  const token = await accessToken(credentials);
  const endpoint =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/` +
    `${encodeURIComponent(packageName)}/purchases/subscriptionsv2/tokens/` +
    `${encodeURIComponent(purchaseToken)}`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const subscription = (await response.json()) as GoogleSubscription;
  if (!response.ok || !subscription.lineItems?.length) {
    throw new Error("Google Play purchase could not be verified");
  }
  const item = subscription.lineItems[0];
  if (!item.productId)
    throw new Error("Google Play purchase has no product ID");
  await acknowledgePurchase(packageName, item.productId, purchaseToken, token);
  const input: SubscriptionInput = {
    userId,
    provider: "google_play",
    providerSubscriptionId: purchaseToken,
    plan: planForBasePlan(item.offerDetails?.basePlanId),
    status: status(subscription.subscriptionState),
    currentPeriodStart: subscription.startTime ?? null,
    currentPeriodEnd: item.expiryTime ?? null,
    cancelAtPeriodEnd:
      item.autoRenewingPlan?.autoRenewEnabled === false ||
      subscription.subscriptionState === "SUBSCRIPTION_STATE_CANCELED",
    providerPayload: subscription,
  };
  await repository.upsertSubscription(input);
}

export async function handleRtdn(purchaseToken: string): Promise<void> {
  const existing = await repository.findSubscriptionByProviderId(
    "google_play",
    purchaseToken,
  );
  if (existing) await verifyPurchase(existing.user_id, purchaseToken);
}
