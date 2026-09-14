import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { DeckCategory } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { CategorySection } from "./CategorySection";
import { AppDecksSearchResults } from "./AppDecksSearchResults";

export function AppDecksPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  const loadTree = useCallback(() => api.categories.tree(), []);
  const {
    data: treeResponse,
    error: treeError,
    loading: treeLoading,
  } = useAsync(loadTree, []);

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    setActiveQuery(query || null);
  }

  const treeErrorMessage =
    treeError instanceof ApiError
      ? treeError.message
      : treeError
        ? t("decks.categoriesLoadError")
        : null;

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("decks.appDecksTitle")}</h1>
        <Link
          to="/"
          className="self-center text-sm text-gray-500 dark:text-gray-400"
        >
          {t("library.myDecks")}
        </Link>
      </header>

      <form onSubmit={onSearchSubmit} className="mb-6 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("decks.appDecksSearchPlaceholder")}
          className="flex-1 rounded-lg border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        >
          {t("library.search")}
        </button>
      </form>

      {activeQuery !== null ? (
        <AppDecksSearchResults q={activeQuery} />
      ) : (
        <>
          {treeLoading && (
            <p className="text-gray-500 dark:text-gray-400">
              {t("common.loading")}
            </p>
          )}
          {treeErrorMessage && (
            <p className="mb-4 text-red-600">{treeErrorMessage}</p>
          )}
          {treeResponse && (
            <ul className="space-y-3">
              {treeResponse.categories.map((category: DeckCategory) => (
                <CategorySection key={category.id} category={category} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
