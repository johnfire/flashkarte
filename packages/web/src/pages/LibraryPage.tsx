import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { LibraryDeck } from "../api/types";
import { useAsync } from "../hooks/use-async";

export function LibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [cloning, setCloning] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const loadDecks = useCallback(async (search: string) => {
    const response = await api.library.list(search.trim() || undefined);
    return response.decks;
  }, []);
  const {
    data: decks,
    error: loadError,
    loading,
    reload,
  } = useAsync<LibraryDeck[], [string]>(loadDecks, [""]);
  const error =
    mutationError ??
    (loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("library.loadError")
        : null);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setMutationError(null);
    void reload(q);
  }

  async function clone(id: string) {
    setCloning(id);
    setMutationError(null);
    try {
      const deck = await api.library.clone(id);
      navigate(`/decks/${deck.id}/study`);
    } catch (err) {
      setMutationError(
        err instanceof ApiError ? err.message : t("library.cloneError"),
      );
      setCloning(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("library.title")}</h1>
        <div className="flex gap-4 text-sm">
          <Link to="/help" className="text-indigo-600">
            {t("common.help")}
          </Link>
          <Link to="/" className="text-indigo-600">
            {t("library.myDecks")}
          </Link>
        </div>
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
      {loading && !error && (
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
