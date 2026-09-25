// llms.txt (https://llmstxt.org): a short Markdown map telling AI agents what
// flashkarte is, how the MCP connection works, and which decks are public.
// Pure builder, no I/O — mounted in mount.ts next to the sitemap.
//
// Only what the public deck pages already show is listed: title, author
// display name and card count. Nothing about private decks or accounts.

export interface LlmsDeck {
  title: string;
  author: string;
  cardCount: number;
  /** Site-relative path of the public deck page, e.g. /d/spanish-basics-<id>. */
  path: string;
}

export interface LlmsSite {
  origin: string;
  mcpUrl: string;
  decks: LlmsDeck[];
}

/** Deck titles are user text: keep them to one line and out of link syntax. */
function linkText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[[\]]/g, (c) => (c === "[" ? "(" : ")"))
    .trim();
}

function describeDeck(origin: string, deck: LlmsDeck): string {
  const cards = deck.cardCount === 1 ? "1 card" : `${deck.cardCount} cards`;
  const title = linkText(deck.title) || "Untitled";
  return `- [${title}](${origin}${deck.path}): ${cards}, by ${linkText(deck.author)}`;
}

function aboutSection(site: LlmsSite): string[] {
  const { origin, mcpUrl } = site;
  const registerUrl = `${new URL(mcpUrl).origin}/oauth/register`;
  return [
    "# flashkarte",
    "",
    "> flashkarte is a flashcard and learning app. People write decks in Markdown, study them with",
    "> spaced repetition (SM-2) on the web and Android, and follow structured courses of lessons.",
    "",
    "## For AI agents",
    "",
    `- MCP server: \`${mcpUrl}\` (Streamable HTTP, OAuth 2.1 with PKCE S256). Clients can register`,
    `  themselves at \`${registerUrl}\`; Claude Code's localhost callback is supported.`,
    "- Connecting: the person signs in with their own flashkarte account (and 2FA code, if enabled)",
    "  and approves the app by name. The agent then works only in that person's account: it can",
    "  read, create, change and delete decks, cards, courses, subjects and lessons and see study",
    "  progress, but cannot touch the account's email, password, 2FA, API keys or data export.",
    "- Changes an agent makes are recorded in flashkarte's audit log as AI-agent actions.",
    `- [Sign up](${origin}/login): accounts are for people. An agent should ask its person to sign up`,
    "  and connect it, rather than creating an account itself.",
    `- [Creating learning content with AI](${origin}/help/ai): what the MCP tools build`,
    `- [Writing decks](${origin}/help/writing-decks): the Markdown deck format`,
    "",
  ];
}

export function buildLlmsTxt(site: LlmsSite): string {
  const lines = aboutSection(site);
  if (site.decks.length > 0) {
    lines.push("## Public decks", "");
    for (const deck of site.decks) lines.push(describeDeck(site.origin, deck));
    lines.push(
      "",
      `More public decks can be browsed at ${site.origin}/explore.`,
      "",
    );
  }
  lines.push(
    "## Optional",
    "",
    `- [Help](${site.origin}/help)`,
    `- [Privacy](${site.origin}/privacy)`,
    `- [Impressum](${site.origin}/impressum)`,
    "",
  );
  return lines.join("\n");
}
