import type { Express } from "express";
import { staticMeta, metaToHeadHtml, PageMeta } from "./meta";
import { inject } from "./inject";
import { buildSitemap, SitemapUrl } from "./sitemap";
import { extractDeckId, deckSlug } from "@flashkarte/shared";
import { deckMeta, deckBodyHtml, DeckPreview } from "./deck";

export interface MountSeoOptions {
  template: string;
  sitemapUrls: () => SitemapUrl[] | Promise<SitemapUrl[]>;
  getDeckPreview?: (id: string) => Promise<DeckPreview | null>;
}

// HTML routes that get server-injected meta.
const STATIC_HTML_ROUTES = [
  "/",
  "/explore",
  "/privacy",
  "/impressum",
  "/guide",
];

export function mountSeo(app: Express, opts: MountSeoOptions): void {
  app.get("/welcome", (_req, res) => res.redirect(301, "/"));

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const urls = await opts.sitemapUrls();
      res.type("application/xml").send(buildSitemap(urls));
    } catch {
      res.sendStatus(500);
    }
  });

  for (const route of STATIC_HTML_ROUTES) {
    app.get(route, (req, res) => {
      const html = inject(opts.template, {
        headHtml: metaToHeadHtml(staticMeta(req.path)),
      });
      res.type("html").send(html);
    });
  }

  if (opts.getDeckPreview) {
    const getDeckPreview = opts.getDeckPreview;
    app.get("/d/:slug", async (req, res) => {
      try {
        const id = extractDeckId(req.params.slug);
        const preview = id ? await getDeckPreview(id) : null;
        if (!preview) {
          const notFound: PageMeta = {
            title: "Deck not found — flashkarte",
            description: "This deck is not available.",
            canonical: "",
            og: {
              title: "Deck not found — flashkarte",
              description: "",
              image: "",
              url: "",
              type: "website",
            },
            robots: "noindex",
          };
          res
            .status(404)
            .send(
              inject(opts.template, { headHtml: metaToHeadHtml(notFound) }),
            );
          return;
        }
        const canonical = deckSlug(preview.title, preview.id);
        if (req.params.slug !== canonical) {
          res.redirect(301, `/d/${canonical}`);
          return;
        }
        res.type("html").send(
          inject(opts.template, {
            headHtml: metaToHeadHtml(deckMeta(preview)),
            bodyHtml: deckBodyHtml(preview),
          }),
        );
      } catch {
        res.sendStatus(500);
      }
    });
  }
}
