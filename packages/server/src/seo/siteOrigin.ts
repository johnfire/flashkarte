export function getSiteOrigin(): string {
  return (
    process.env.SITE_ORIGIN ?? "https://flashkarte.christopherrehm.de"
  ).replace(/\/$/, "");
}
