import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";

/**
 * The owner notes what is unclear or wrong about a screen, against its permanent number. Their AI
 * reads it later and answers it (usually with a clarifying screen numbered next to this one).
 */
export function CommentOnScreen({
  subjectId,
  number,
}: {
  subjectId: string;
  number: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setState("saving");
    setError(null);
    try {
      await api.learn.comment(subjectId, number, body.trim());
      setBody("");
      setState("saved");
      setOpen(false);
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("learn.commentError"),
      );
      setState("idle");
    }
  }

  return (
    <div className="mt-6 text-sm">
      {state === "saved" && !open && (
        <p role="status" className="mb-2 text-green-700 dark:text-green-400">
          {t("learn.commentSaved", { number })}
        </p>
      )}
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-indigo-700 underline dark:text-indigo-300"
        >
          {t("learn.commentOpen", { number })}
        </button>
      ) : (
        <form onSubmit={send} className="space-y-2">
          <label htmlFor={`comment-${number}`} className="block font-medium">
            {t("learn.commentLabel", { number })}
          </label>
          <textarea
            id={`comment-${number}`}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full rounded-lg border p-2"
          />
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={state === "saving" || !body.trim()}
              className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              {t("learn.commentSend")}
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
