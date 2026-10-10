/**
 * Every URL pattern the web app renders (web/src/App.tsx). Anything else is
 * not a page, and should answer 404 so crawlers drop it instead of indexing the
 * app shell under an arbitrary address ("soft 404"). app-routes.test.ts fails
 * when this list and App.tsx disagree, so a new route cannot be forgotten here
 * and end up 404ing on a hard refresh.
 */
export const APP_ROUTES = [
  "/",
  "/welcome",
  "/login",
  "/privacy",
  "/impressum",
  "/schools-and-teachers",
  "/guide",
  "/help",
  "/help/getting-started",
  "/help/writing-decks",
  "/help/advanced-cards",
  "/help/branching-decks",
  "/help/studying",
  "/help/ai",
  "/help/sharing",
  "/explore",
  "/d/:slug",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/decks/new",
  "/decks/:id/study",
  "/decks/:id/cards",
  "/decks/:id/cards/:cardId",
  "/decks/:id/senses/:word/reorder",
  "/library",
  "/library/community/decks",
  "/library/official/decks",
  "/courses",
  "/library/courses/:source/collections/:id",
  "/library/courses/:source",
  "/courses/decks",
  "/courses/import",
  "/courses/:id",
  "/library/courses",
  "/app-decks",
  "/app-decks/:id",
  "/learn",
  "/learn/collections/:collectionId",
  "/learn/:subjectId",
  "/learn/:subjectId/lessons/:slug",
  "/learn/:subjectId/lessons/:slug/read",
  "/learn/:subjectId/reviews",
  "/settings",
  "/admin",
  "/admin/schools/:id",
] as const;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Case-insensitive with an optional trailing slash, because that is how the
// client router matches: a URL it would render must not be 404ed here.
const PATTERNS = APP_ROUTES.map((route) => {
  const segments = route.split("/").filter(Boolean);
  const body = segments
    .map((s) => (s.startsWith(":") ? "[^/]+" : escapeRegExp(s)))
    .join("/");
  return new RegExp(`^/${body}${segments.length ? "/?" : ""}$`, "i");
});

export function isKnownAppPath(pathname: string): boolean {
  return PATTERNS.some((pattern) => pattern.test(pathname));
}
