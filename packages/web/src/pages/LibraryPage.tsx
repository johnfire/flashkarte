import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { LibraryDeck } from "../api/types";

export function LibraryPage() {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<LibraryDeck[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    setError(null);
    try {
      const { decks } = await api.library.list(search.trim() || undefined);
      setDecks(decks);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't load the library",
      );
    }
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setDecks(null);
    load(q);
  }

  async function clone(id: string) {
    setCloning(id);
    setError(null);
    try {
      const deck = await api.library.clone(id);
      navigate(`/decks/${deck.id}/study`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't clone deck");
      setCloning(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Library</h1>
        <Link to="/" className="text-sm text-indigo-600">
          ← My decks
        </Link>
      </header>

      <form onSubmit={onSearch} className="mb-6 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search public decks…"
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          Search
        </button>
      </form>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {decks === null && !error && (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      )}
      {decks && decks.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          No public decks found.
        </p>
      )}

      <ul className="space-y-2">
        {decks?.map((d) => (
          <li
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{d.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {d.cardCount} cards · by {d.author}
              </p>
            </div>
            <button
              onClick={() => clone(d.id)}
              disabled={cloning === d.id}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {cloning === d.id ? "Cloning…" : "Clone"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
