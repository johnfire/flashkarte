import { createIssue } from "../../github/issues";

export interface BugReportInput {
  title: string;
  description: string;
  appVersion?: string;
  platform?: string;
  device?: string;
  userId: string;
  email: string;
}

/**
 * Builds the GitHub issue body. The reporter's description is wrapped in a code
 * fence so it renders as literal text — a blockquote does NOT neutralize fenced
 * code blocks or `![img](url)` references (which would fetch a remote image and
 * log a maintainer's IP on view). The fence length is chosen to exceed any
 * backtick run in the input so the description can't close the fence early.
 */
export function buildIssueBody(input: BugReportInput): string {
  const meta = [
    `**Reporter:** ${input.email} (\`${input.userId}\`)`,
    `**App version:** ${input.appVersion ?? "unknown"}`,
    `**Platform:** ${input.platform ?? "unknown"}`,
    `**Device:** ${input.device ?? "unknown"}`,
  ].join("\n");

  const longestTicks = (input.description.match(/`+/g) ?? []).reduce(
    (max, run) => Math.max(max, run.length),
    0,
  );
  const fence = "`".repeat(Math.max(3, longestTicks + 1));
  const quoted = `${fence}\n${input.description}\n${fence}`;

  return `${meta}\n\n---\n\n${quoted}\n\n_Filed from the flashkarte app._`;
}

/**
 * Files a user's bug report as a GitHub issue. Returns the issue URL, or null
 * when no token is configured (the report is logged instead).
 */
export async function submitBugReport(
  input: BugReportInput,
): Promise<{ issueUrl: string | null }> {
  const { url } = await createIssue({
    title: `[app] ${input.title}`,
    body: buildIssueBody(input),
    labels: ["bug", "from-app"],
  });
  return { issueUrl: url };
}
