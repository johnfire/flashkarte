import { getSiteOrigin } from "./siteOrigin";
import { escapeHtml, escapeJsonLd } from "./escape";

export interface OgMeta {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
}
export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  og: OgMeta;
  jsonLd?: Record<string, unknown>;
  robots?: string;
}

function abs(path: string): string {
  return `${getSiteOrigin()}${path}`;
}

const PAGES: Record<
  string,
  { title: string; description: string; jsonLd?: boolean }
> = {
  "/": {
    title: "flashkarte — Learn anything with spaced-repetition flashcards",
    description:
      "flashkarte is a free spaced-repetition flashcard app. Write decks in plain Markdown or let your own AI build them, and study on web and Android — always in sync.",
    jsonLd: true,
  },
  "/explore": {
    title: "Explore public flashcard decks — flashkarte",
    description:
      "Browse free, community-shared flashcard decks on flashkarte and clone any of them into your account to start studying.",
  },
  "/privacy": {
    title: "Privacy Policy — flashkarte",
    description:
      "How flashkarte handles your data: what we collect, what we never do, and your rights.",
  },
  "/impressum": {
    title: "Impressum — flashkarte",
    description: "Legal provider information for flashkarte (Impressum).",
  },
};

export function staticMeta(path: string): PageMeta {
  const page = PAGES[path] ?? PAGES["/"];
  const canonical = abs(path === "/" ? "/" : path);
  const image = abs("/og.png");
  const meta: PageMeta = {
    title: page.title,
    description: page.description,
    canonical,
    og: {
      title: page.title,
      description: page.description,
      image,
      url: canonical,
      type: "website",
    },
  };
  if (page.jsonLd) {
    meta.jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "flashkarte",
      url: abs("/"),
      description: page.description,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web, Android",
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    };
  }
  return meta;
}

export function metaToHeadHtml(meta: PageMeta): string {
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.og.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.og.description)}" />`,
    `<meta property="og:image" content="${escapeHtml(meta.og.image)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.og.url)}" />`,
    `<meta property="og:type" content="${escapeHtml(meta.og.type)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.og.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.og.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(meta.og.image)}" />`,
    `<meta name="theme-color" content="#4f46e5" />`,
  ];
  if (meta.robots) {
    tags.push(`<meta name="robots" content="${escapeHtml(meta.robots)}" />`);
  }
  if (meta.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${escapeJsonLd(meta.jsonLd)}</script>`,
    );
  }
  return tags.join("\n    ");
}
