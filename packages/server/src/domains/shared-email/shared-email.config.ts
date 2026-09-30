import type { SharedEmailTenant } from "./shared-email.types";

interface ConfiguredTenant extends SharedEmailTenant {
  secret: string;
}

let cachedTenants: ConfiguredTenant[] | null = null;

function readConfiguredTenants(): ConfiguredTenant[] {
  const raw = process.env.EMAIL_SERVICE_TENANTS;
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("EMAIL_SERVICE_TENANTS must be valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("EMAIL_SERVICE_TENANTS must be a JSON object");
  }
  return Object.entries(parsed).map(([slug, value]) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`EMAIL_SERVICE_TENANTS.${slug} must be an object`);
    }
    const config = value as Record<string, unknown>;
    if (
      typeof config.secret !== "string" ||
      config.secret.length < 32 ||
      typeof config.fromAddress !== "string" ||
      !config.fromAddress.includes("@")
    ) {
      throw new Error(
        `EMAIL_SERVICE_TENANTS.${slug} requires a strong secret and fromAddress`,
      );
    }
    return {
      slug,
      secret: config.secret,
      fromAddress: config.fromAddress,
      replyTo: typeof config.replyTo === "string" ? config.replyTo : null,
    };
  });
}

export function getConfiguredSharedEmailTenants(): ConfiguredTenant[] {
  if (!cachedTenants) cachedTenants = readConfiguredTenants();
  return cachedTenants;
}

export function getSharedEmailTenant(slug: string): SharedEmailTenant {
  const tenant = getConfiguredSharedEmailTenants().find(
    (candidate) => candidate.slug === slug,
  );
  if (!tenant) throw new Error(`Unknown shared email tenant: ${slug}`);
  return {
    slug: tenant.slug,
    fromAddress: tenant.fromAddress,
    replyTo: tenant.replyTo,
  };
}

export function resetSharedEmailConfigForTests(): void {
  cachedTenants = null;
}
