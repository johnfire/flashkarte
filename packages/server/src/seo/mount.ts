import type { Express } from "express";
import { staticMeta, metaToHeadHtml } from "./meta";
import { inject } from "./inject";
import { buildSitemap, SitemapUrl } from "./sitemap";

export interface MountSeoOptions {
  template: string;
  sitemapUrls: () => SitemapUrl[] | Promise<SitemapUrl[]>;
}

// HTML routes that get server-injected meta. Phase 2 adds "/explore" + "/d/:slug".
const STATIC_HTML_ROUTES = ["/", "/privacy", "/impressum"];

export function mountSeo(app: Express, opts: MountSeoOptions): void {
  app.get("/welcome", (_req, res) => res.redirect(301, "/"));

  app.get("/sitemap.xml", async (_req, res) => {
    const urls = await opts.sitemapUrls();
    res.type("application/xml").send(buildSitemap(urls));
  });

  for (const route of STATIC_HTML_ROUTES) {
    app.get(route, (req, res) => {
      const html = inject(opts.template, {
        headHtml: metaToHeadHtml(staticMeta(req.path)),
      });
      res.type("html").send(html);
    });
  }
}
