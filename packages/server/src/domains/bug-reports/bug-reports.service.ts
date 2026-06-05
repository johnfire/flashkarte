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
 * Builds the GitHub issue body. The reporter's description goes inside a
 * blockquote so it can't inject headings/markup into the metadata section.
 */
export function buildIssueBody(input: BugReportInput): string {
  const meta = [
    `**Reporter:** ${input.email} (\`${input.userId}\`)`,
    `**App version:** ${input.appVersion ?? "unknown"}`,
    `**Platform:** ${input.platform ?? "unknown"}`,
    `**Device:** ${input.device ?? "unknown"}`,
  ].join("\n");

  const quoted = input.description
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

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
