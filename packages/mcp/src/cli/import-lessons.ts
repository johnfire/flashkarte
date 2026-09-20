/* eslint-disable no-console -- a command line tool: printing is its output */
import fs from "fs";
import { ApiError, get, post } from "../api";

/**
 * Imports lesson files into a subject straight from disk, so a lesson written by a script does not
 * have to be read back and retyped into a tool call.
 *
 *   FLASHKARTE_API_URL=https://... FLASHKARTE_API_KEY=fk_... \
 *     node dist/cli/import-lessons.js --subject <uuid> lesson-a.json lesson-b.json
 *
 * Files are imported in the order given, so list prerequisite lessons first. Each file is the JSON
 * import_lesson takes (module, lesson, screens, questions), in the full or the compact form.
 *
 * The key must be an AI (deck-scoped) key: the server records what it writes as AI-authored, for the
 * owner to review. A full-scope key would record it as the owner's own writing, so it is refused
 * unless --allow-full-key is given. The key is read from the environment, never from an argument.
 */

const USAGE =
  "usage: import-lessons --subject <subject-uuid> [--allow-full-key] <lesson.json>...\n" +
  "  env: FLASHKARTE_API_URL (default http://localhost:3001), FLASHKARTE_API_KEY (an fk_ AI key)";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const API_KEY = /^fk_[0-9a-f]{64}$/;
const LOCAL_URL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/;

export const EXIT = { ok: 0, failed: 1, importedWithIssues: 2 } as const;

interface Io {
  readFile: (path: string) => string;
  log: (line: string) => void;
  error: (line: string) => void;
  env: Record<string, string | undefined>;
}

interface Options {
  subject: string;
  allowFullKey: boolean;
  files: string[];
}

function parseArguments(argv: string[]): Options | string {
  let subject = "";
  let allowFullKey = false;
  const files: string[] = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--subject") subject = argv[++index] ?? "";
    else if (arg === "--allow-full-key") allowFullKey = true;
    else if (arg.startsWith("--")) return `unknown option ${arg}`;
    else files.push(arg);
  }
  if (!UUID.test(subject)) return "--subject must be a subject UUID";
  if (files.length === 0) return "give at least one lesson file";
  return { subject, allowFullKey, files };
}

/** Why this setup should not be used, or null when it is safe to go on. */
function refuseUnsafeSetup(env: Io["env"]): string | null {
  const key = env.FLASHKARTE_API_KEY ?? "";
  if (!API_KEY.test(key)) {
    return "FLASHKARTE_API_KEY must be set to an fk_ API key";
  }
  const url = env.FLASHKARTE_API_URL ?? "http://localhost:3001";
  if (!url.startsWith("https://") && !LOCAL_URL.test(url)) {
    return "FLASHKARTE_API_URL must be https:// (or http://localhost): the key is sent with every request";
  }
  if (env.NODE_ENV === "production") {
    return "the API client ignores FLASHKARTE_API_KEY when NODE_ENV=production";
  }
  return null;
}

/**
 * A full-scope key can read /api/keys and a deck-scoped one is refused with 403. So this tells the
 * two apart without needing to see the key or ask the server what kind it is.
 */
async function keyIsFullScope(): Promise<boolean | string> {
  try {
    await get("/api/keys");
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return false;
    if (error instanceof ApiError && error.status === 401) {
      return "the server did not accept the API key";
    }
    return error instanceof Error ? error.message : String(error);
  }
}

interface ImportResult {
  lesson: { slug: string; stage: string };
  module: { title: string };
  screens: unknown[];
  question_ids: unknown[];
  issues: { level?: string; code?: string; message: string }[];
}

function readLesson(io: Io, file: string): Record<string, unknown> | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(io.readFile(file));
  } catch (error) {
    return `${file}: ${error instanceof Error ? error.message : String(error)}`;
  }
  const lesson = parsed as Record<string, unknown> | null;
  if (
    !lesson ||
    typeof lesson.lesson !== "object" ||
    !Array.isArray(lesson.screens) ||
    !Array.isArray(lesson.questions)
  ) {
    return `${file}: expected an object with lesson, screens and questions`;
  }
  return {
    ...(typeof lesson.module === "string" && { module: lesson.module }),
    lesson: lesson.lesson,
    screens: lesson.screens,
    questions: lesson.questions,
  };
}

export async function runImportLessons(
  argv: string[],
  io: Io = {
    readFile: (path) => fs.readFileSync(path, "utf8"),
    log: (line) => console.log(line),
    error: (line) => console.error(line),
    env: process.env,
  },
): Promise<number> {
  const options = parseArguments(argv);
  if (typeof options === "string") {
    io.error(`${options}\n${USAGE}`);
    return EXIT.failed;
  }
  const unsafe = refuseUnsafeSetup(io.env);
  if (unsafe) {
    io.error(unsafe);
    return EXIT.failed;
  }

  const full = await keyIsFullScope();
  if (typeof full === "string") {
    io.error(full);
    return EXIT.failed;
  }
  if (full && !options.allowFullKey) {
    io.error(
      "This is a full-scope key, so what it imports would be recorded as your own writing, not as AI-authored. " +
        "Use an AI (deck-scoped) key, or pass --allow-full-key if you mean it.",
    );
    return EXIT.failed;
  }

  let anyIssues = false;
  for (const file of options.files) {
    const body = readLesson(io, file);
    if (typeof body === "string") {
      io.error(body);
      return EXIT.failed;
    }
    try {
      const result = await post<ImportResult>(
        `/api/subjects/${options.subject}/lessons/import`,
        body,
      );
      io.log(
        `${file}: ${result.lesson.slug} (${result.lesson.stage}) in "${result.module.title}", ` +
          `${result.screens.length} screens, ${result.question_ids.length} questions, ` +
          `${result.issues.length} issues`,
      );
      for (const issue of result.issues) {
        anyIssues = true;
        io.log(
          `  ${issue.level ?? "issue"} ${issue.code ?? ""}: ${issue.message}`,
        );
      }
    } catch (error) {
      // Later lessons may depend on this one, so stop rather than import them out of order.
      io.error(
        `${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return EXIT.failed;
    }
  }
  return anyIssues ? EXIT.importedWithIssues : EXIT.ok;
}

if (require.main === module) {
  runImportLessons(process.argv.slice(2)).then((code) => process.exit(code));
}
