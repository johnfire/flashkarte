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
    title: "LearnWohl — Flashcard decks and full custom courses",
    description:
      "Flashcard decks and full custom courses for your study needs.",
    jsonLd: true,
  },
  "/explore": {
    title: "Explore public flashcard decks — LearnWohl",
    description:
      "Browse free, community-shared flashcard decks on LearnWohl and clone any of them into your account to start studying.",
  },
  "/privacy": {
    title: "Privacy Policy — LearnWohl",
    description:
      "How LearnWohl handles your data: what we collect, what we never do, and your rights.",
  },
  "/impressum": {
    title: "Impressum — LearnWohl",
    description: "Legal provider information for LearnWohl (Impressum).",
  },
  // Help center. Titles and descriptions mirror help.*.metaTitle/metaDescription in
  // web/src/i18n/locales/en.json; help-meta.test.ts fails if the two drift apart.
  "/help": {
    title: "Help — LearnWohl",
    description:
      "Everything you need to use LearnWohl: writing Markdown flashcard decks, deck collections, structured learning courses, sharing, and connecting your own AI.",
  },
  "/help/getting-started": {
    title: "Getting started — LearnWohl Help",
    description: "How to sign up and get studying with LearnWohl.",
  },
  "/help/writing-decks": {
    title: "Writing decks — LearnWohl Help",
    description:
      "The Markdown format LearnWohl uses for cards, and the three ways to create a deck.",
  },
  "/help/advanced-cards": {
    title: "Advanced card types — LearnWohl Help",
    description:
      "How to write diagnostic multiple-choice cards with follow-up remediation, and cards for words with more than one meaning.",
  },
  "/help/branching-decks": {
    title: "Branching decks — LearnWohl Help",
    description: "How to write a choose-your-path branching deck in LearnWohl.",
  },
  "/help/studying": {
    title: "Studying & spaced repetition — LearnWohl Help",
    description:
      "How LearnWohl schedules reviews, what the rating buttons do, and what the deck counters mean.",
  },
  "/help/ai": {
    title: "Creating learning content with AI — LearnWohl Help",
    description:
      "How to connect your own AI assistant to LearnWohl over MCP to build flashcard decks, deck collections, and structured learning courses.",
  },
  "/help/sharing": {
    title: "Sharing & exploring — LearnWohl Help",
    description:
      "How to share flashcard decks and structured learning courses, browse Explore, and use the Library.",
  },
};

/** Every help-center page that has its own server-rendered meta, in menu order. */
export const HELP_PATHS = Object.keys(PAGES).filter(
  (path) => path === "/help" || path.startsWith("/help/"),
);

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
      name: "LearnWohl",
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
