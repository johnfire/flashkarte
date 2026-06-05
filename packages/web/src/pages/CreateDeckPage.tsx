import { useState, useMemo, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { parseDeck } from "@flashkarte/shared";
import { api, ApiError } from "../api/client";

const PLACEHOLDER = `# My Deck Title
## Optional Category
**1. What is the capital of France?**
Paris.

**2. 2 + 2 = ?**
4.`;

export function CreateDeckPage() {
  const navigate = useNavigate();
  const [markdown, setMarkdown] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const preview = useMemo(
    () => (markdown.trim() ? parseDeck(markdown, "") : null),
    [markdown],
  );
  const canSave =
    file !== null || (preview !== null && preview.cards.length > 0);

  async function onFileChange(f: File | null) {
    setFile(f);
    if (f) setMarkdown(await f.text());
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const deck = file
        ? await api.decks.createFromFile(file)
        : await api.decks.create(markdown);
      void deck;
      navigate("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't save the deck",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-2 text-3xl font-bold">New Deck</h1>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Paste Markdown or upload a <code>.md</code>/<code>.txt</code> file. Use{" "}
        <code># Title</code>, <code>## Category</code>, and{" "}
        <code>**1. Question**</code> followed by the answer.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="file"
          accept=".md,.txt,text/markdown,text/plain"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          className="block text-sm"
        />

        <textarea
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value);
            setFile(null);
          }}
          placeholder={PLACEHOLDER}
          rows={14}
          className="w-full rounded-lg border p-3 font-mono text-sm"
        />

        <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3 text-sm" aria-live="polite">
          {preview ? (
            preview.cards.length > 0 ? (
              <>
                <p className="font-medium">
                  {preview.title || "Untitled"} — {preview.cards.length}{" "}
                  {preview.cards.length === 1 ? "card" : "cards"}
                </p>
                <ul className="mt-1 list-disc pl-5 text-gray-600 dark:text-gray-300">
                  {preview.cards.slice(0, 3).map((c, i) => (
                    <li key={i}>{c.front}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-amber-700">
                No cards detected — check the format.
              </p>
            )
          ) : (
            <p className="text-gray-400 dark:text-gray-500">Preview appears here.</p>
          )}
        </div>

        {error && <p className="text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!canSave || busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save deck"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
