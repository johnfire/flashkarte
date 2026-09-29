import type { Express } from "express";
import { staticMeta, metaToHeadHtml, notFoundMeta, HELP_PATHS } from "./meta";
import { inject } from "./inject";
import { getSiteOrigin } from "./siteOrigin";
import { buildSitemap, SitemapUrl } from "./sitemap";
import { extractDeckId, deckSlug } from "@flashkarte/shared";
import { deckMeta, deckBodyHtml, DeckPreview } from "./deck";

export interface MountSeoOptions {
  template: string;
  sitemapUrls: () => SitemapUrl[] | Promise<SitemapUrl[]>;
  getDeckPreview?: (id: string) => Promise<DeckPreview | null>;
  /** The /llms.txt guide for AI agents. */
  llmsTxt?: () => Promise<string>;
}

// HTML routes that get server-injected meta.
const STATIC_HTML_ROUTES = [
  "/",
  "/explore",
  "/privacy",
  "/impressum",
  ...HELP_PATHS,
];

export function mountSeo(app: Express, opts: MountSeoOptions): void {
  // One site, one address. The same pages answering on www.<domain> split links
  // and ranking signals between two hosts; canonical tags only ask crawlers to
  // merge them, a 301 makes them. Only GET/HEAD: a redirect would turn a POST
  // into a GET. Derived from SITE_ORIGIN, so it can neither point at the wrong
  // host nor loop.
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const origin = new URL(getSiteOrigin());
    if (req.hostname.toLowerCase() === `www.${origin.hostname}`) {
      res.redirect(301, `${origin.origin}${req.originalUrl}`);
      return;
    }
    next();
  });

  app.get("/welcome", (_req, res) => res.redirect(301, "/"));
  // The single guide page became the help center. Redirect on the server so a
  // crawler gets a real 301 rather than a 200 that only JavaScript turns into /help.
  app.get("/guide", (_req, res) => res.redirect(301, "/help"));

  app.get("/sitemap.xml", async (_req, res) => {
    try {
      const urls = await opts.sitemapUrls();
      res.type("application/xml").send(buildSitemap(urls));
    } catch {
      res.sendStatus(500);
    }
  });

  if (opts.llmsTxt) {
    const llmsTxt = opts.llmsTxt;
    app.get("/llms.txt", async (_req, res) => {
      try {
        res.type("text/plain; charset=utf-8").send(await llmsTxt());
      } catch {
        res.sendStatus(500);
      }
    });
  }

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
          const notFound = notFoundMeta(
            "Deck not found — LearnWohl",
            "This deck is not available.",
          );
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
