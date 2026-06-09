import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { LibraryDeck } from "../api/types";

export function LibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [decks, setDecks] = useState<LibraryDeck[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);

  const load = useCallback(
    async (search: string) => {
      setError(null);
      try {
        const { decks } = await api.library.list(search.trim() || undefined);
        setDecks(decks);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : t("library.loadError"),
        );
      }
    },
    [t],
  );

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
      setError(err instanceof ApiError ? err.message : t("library.cloneError"));
      setCloning(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("library.title")}</h1>
        <Link to="/" className="text-sm text-indigo-600">
          {t("library.myDecks")}
        </Link>
      </header>

      <form onSubmit={onSearch} className="mb-6 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("library.searchPlaceholder")}
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          {t("library.search")}
        </button>
      </form>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {decks === null && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("library.loading")}
        </p>
      )}
      {decks && decks.length === 0 && !error && (
        <p className="text-gray-500 dark:text-gray-400">{t("library.empty")}</p>
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
                {t("library.cardsByAuthor", {
                  count: d.cardCount,
                  author: d.author,
                })}
              </p>
            </div>
            <button
              onClick={() => clone(d.id)}
              disabled={cloning === d.id}
              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {cloning === d.id ? t("library.cloning") : t("library.clone")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
