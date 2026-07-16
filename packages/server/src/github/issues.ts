import { logger } from "../utils/logger";

// GitHub issue creation. The repo + token are configured via env
// (GITHUB_TOKEN, GITHUB_REPO). When GITHUB_TOKEN is unset (local dev, tests,
// CI) we don't call the API — we log the issue instead, so flows work
// end-to-end and no report is lost. Mirrors the email/mailer.ts pattern.

const DEFAULT_REPO = "johnfire/flashkarte";

export interface NewIssue {
  title: string;
  body: string;
  labels?: string[];
}

function getRepo(): string {
  return (process.env.GITHUB_REPO ?? DEFAULT_REPO).trim();
}

/**
 * Files a GitHub issue. Returns the created issue URL, or null when no token
 * is configured or the API rejects the request (best-effort — never throws).
 */
export async function createIssue(
  issue: NewIssue,
): Promise<{ url: string | null }> {
  const token = process.env.GITHUB_TOKEN;
  const repo = getRepo();

  if (!token) {
    logger.warn(
      "github.createIssue",
      "github-issue: no GITHUB_TOKEN — logging instead of filing",
      {
        repo,
        title: issue.title,
        labels: issue.labels,
      },
    );
    return { url: null };
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "flashkarte-server",
      },
      body: JSON.stringify({
        title: issue.title,
        body: issue.body,
        labels: issue.labels ?? [],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.error("github.createIssue", "github-issue: API rejected request", {
        repo,
        status: res.status,
        body: text.slice(0, 500),
      });
      return { url: null };
    }

    const created = (await res.json()) as { html_url?: string };
    return { url: created.html_url ?? null };
  } catch (err) {
    logger.error("github.createIssue", "github-issue: request failed", {
      repo,
      error: err instanceof Error ? err.message : String(err),
    });
    return { url: null };
  }
}
