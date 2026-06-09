import { escapeHtml } from "./escape";

export interface SitemapUrl {
  loc: string;
  changefreq?: string;
  priority?: string;
}

export function buildSitemap(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const parts = [`<loc>${escapeHtml(u.loc)}</loc>`];
      if (u.changefreq) parts.push(`<changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) parts.push(`<priority>${u.priority}</priority>`);
      return `  <url>${parts.join("")}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}
