import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { HelpNotice } from "../api/learn-types";
import { helpPrompt } from "./helpPrompt";

const MAX_SELECTION = 500;

/** The passage the learner has selected on the page, if any (kept short). */
function selectedPassage(): string {
  return (window.getSelection?.()?.toString() ?? "")
    .trim()
    .slice(0, MAX_SELECTION);
}

/**
 * "I need more on this". The learner asks their own AI to explain more, optionally with the passage
 * they selected and a note. MCP is pull-only, so the request waits in a queue until their AI next
 * runs; this says so plainly, shows where an answer landed, and offers a ready-made message to paste
 * to their AI if they do not want to wait.
 */
export function NeedMoreOnThis({
  subjectId,
  slug,
  target,
  screenNumber,
  notices,
}: {
  subjectId: string;
  slug: string;
  target: { screen: string } | { question: string };
  /** The screen the request is about (for a question, the one that teaches it is chosen by the server). */
  screenNumber: string | null;
  notices: HelpNotice[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [passage, setPassage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const waiting = state === "sent" || notices.some((n) => n.status === "open");
  const answered = notices.filter((n) => n.status === "answered");
  const about = "screen" in target ? "screen" : "question";

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setState("sending");
    setError(null);
    try {
      await api.learn.askForMore(subjectId, target, {
        ...(passage && { selection: passage }),
        ...(note.trim() && { note: note.trim() }),
      });
      setState("sent");
      setOpen(false);
      setNote("");
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("learn.helpError"),
      );
      setState("idle");
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(
        helpPrompt({ subjectId, lesson: slug, screen: screenNumber, about }),
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 space-y-2 text-sm">
      {answered.map((notice) => (
        <p
          key={notice.id}
          role="status"
          className="text-green-800 dark:text-green-300"
        >
          {t("learn.helpAnswered", { list: notice.answers.join(", ") })}
        </p>
      ))}
      {waiting && (
        <div role="status" className="space-y-1">
          <p>{t("learn.helpWaiting")}</p>
          <button
            type="button"
            onClick={copyPrompt}
            className="text-indigo-700 underline dark:text-indigo-300"
          >
            {copied ? t("learn.helpCopied") : t("learn.helpCopyPrompt")}
          </button>
        </div>
      )}
      {!waiting && !open && (
        <button
          type="button"
          onClick={() => {
            setPassage(selectedPassage());
            setOpen(true);
          }}
          className="rounded-lg border px-3 py-1.5 font-medium text-indigo-700 dark:text-indigo-300"
        >
          {t("learn.helpOpen")}
        </button>
      )}
      {open && (
        <form onSubmit={send} className="space-y-2">
          {passage && (
            <p className="rounded bg-gray-100 p-2 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              <span className="font-medium">{t("learn.helpPassage")}</span> “
              {passage}”
            </p>
          )}
          <label htmlFor="help-note" className="block font-medium">
            {t("learn.helpLabel")}
          </label>
          <textarea
            id="help-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-lg border p-2"
          />
          <p className="text-gray-600 dark:text-gray-400">
            {t("learn.helpHow")}
          </p>
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={state === "sending"}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {t("learn.helpSend")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border px-4 py-2"
            >
              {t("learn.commentCancel")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
