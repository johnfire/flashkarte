import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { deckPath } from "@flashkarte/shared";
import { api, ApiError } from "../api/client";
import { LibraryDeck } from "../api/types";
import { useDocumentHead } from "../seo/useDocumentHead";
import { useAsync } from "../hooks/use-async";

export function ExplorePage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: "Explore public flashcard decks — flashkarte",
    description:
      "Browse free, community-shared flashcard decks on flashkarte and clone any of them into your account to start studying.",
  });
  const [q, setQ] = useState("");

  const loadDecks = useCallback(async (search: string) => {
    const response = await api.publicLibrary.list(search.trim() || undefined);
    return response.decks;
  }, []);
  const {
    data: decks,
    error: loadError,
    loading,
    reload,
  } = useAsync<LibraryDeck[], [string]>(loadDecks, [""]);
  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("explore.loadError")
        : null;

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    void reload(q);
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("explore.title")}</h1>
        <Link to="/" className="text-sm text-indigo-600">
          {t("explore.home")}
        </Link>
      </header>
      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t("explore.searchPlaceholder")}
          placeholder={t("explore.searchPlaceholder")}
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white">
          {t("explore.search")}
        </button>
      </form>
      {error && <p className="mb-3 text-red-600">{error}</p>}
      {loading && !error && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {decks && decks.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">{t("explore.empty")}</p>
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
              {t("decks.cardCount", { count: d.cardCount })} ·{" "}
              {t("explore.by", { author: d.author })}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
