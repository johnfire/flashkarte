import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { deckPath } from "@flashkarte/shared";
import { api, ApiError } from "../api/client";
import { LibraryDeck } from "../api/types";
import { useDocumentHead } from "../seo/useDocumentHead";

export function ExplorePage() {
  useDocumentHead({
    title: "Explore public flashcard decks — flashkarte",
    description:
      "Browse free, community-shared flashcard decks on flashkarte and clone any of them into your account to start studying.",
  });
  const [decks, setDecks] = useState<LibraryDeck[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    setError(null);
    try {
      const { decks } = await api.publicLibrary.list(
        search.trim() || undefined,
      );
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

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Explore decks</h1>
        <Link to="/" className="text-sm text-indigo-600">
          ← Home
        </Link>
      </header>
      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search public decks…"
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
          Search
        </button>
      </form>
      {error && <p className="mb-3 text-red-600">{error}</p>}
      {decks === null && !error && (
        <p className="text-gray-500 dark:text-gray-400">Loading…</p>
      )}
      {decks && decks.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">
          No public decks found.
        </p>
      )}
      <ul className="space-y-2">
        {decks?.map((d) => (
          <li key={d.id} className="rounded-lg border p-3">
            <Link
              to={deckPath(d.title, d.id)}
              className="font-medium text-indigo-600 hover:underline"
            >
              {d.title}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {d.cardCount} cards · by {d.author}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
