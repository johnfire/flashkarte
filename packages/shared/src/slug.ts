export function slugify(input: string): string {
  const s = input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  return s || "deck";
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

export function extractDeckId(slug: string): string | null {
  const m = slug.match(new RegExp(`(${UUID})$`, "i"));
  return m ? m[1].toLowerCase() : null;
}

export function deckSlug(title: string, id: string): string {
  return `${slugify(title)}-${id}`;
}

export function deckPath(title: string, id: string): string {
  return `/d/${deckSlug(title, id)}`;
}
