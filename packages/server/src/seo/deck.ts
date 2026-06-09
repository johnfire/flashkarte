import { deckPath } from "@flashkarte/shared";
import { getSiteOrigin } from "./siteOrigin";
import { escapeHtml } from "./escape";
import type { PageMeta } from "./meta";

export interface DeckPreview {
  id: string;
  title: string;
  author: string;
  cardCount: number;
  publishedAt: string | null;
  cards: { front: string; category: string | null }[];
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function deckMeta(p: DeckPreview): PageMeta {
  const canonical = `${getSiteOrigin()}${deckPath(p.title, p.id)}`;
  const image = `${getSiteOrigin()}/og.png`;
  const samples = p.cards
    .slice(0, 3)
    .map((c) => oneLine(c.front))
    .filter(Boolean)
    .join("; ");
  const title = `${p.title} — flashcards by ${p.author} | flashkarte`;
  const description = oneLine(
    `${p.cardCount} flashcards by ${p.author}.${samples ? ` Includes: ${samples}` : ""}`,
  ).slice(0, 300);
  return {
    title,
    description,
    canonical,
    og: { title, description, image, url: canonical, type: "article" },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: p.title,
      url: canonical,
      learningResourceType: "Flashcards",
      author: { "@type": "Person", name: p.author },
      numberOfItems: p.cardCount,
      isAccessibleForFree: true,
    },
  };
}

export function deckBodyHtml(p: DeckPreview): string {
  const items = p.cards.map((c) => `<li>${escapeHtml(c.front)}</li>`).join("");
  return (
    `<main><h1>${escapeHtml(p.title)}</h1>` +
    `<p>${p.cardCount} flashcards by ${escapeHtml(p.author)}</p>` +
    `<ul>${items}</ul>` +
    `<p>Sign up free to study the answers.</p></main>`
  );
}
