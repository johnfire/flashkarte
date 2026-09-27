import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { DeckCategory } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { CategorySection } from "./CategorySection";
import { CategoryContents } from "./CategoryContents";
import { AppDecksSearchResults } from "./AppDecksSearchResults";
import { ContentLanguageSwitcher } from "../components/ContentLanguageSwitcher";
import { useContentLanguage } from "../hooks/use-content-language";

const getOfficialCount = (category: DeckCategory) => category.officialCount;
export function AppDecksPage() {
  const { t } = useTranslation();
  const { language, choose } = useContentLanguage("library");
  const filter = language === "all" ? undefined : language;
  const [q, setQ] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);

  const loadTree = useCallback(() => api.categories.tree(filter), [filter]);
  const renderOfficialContents = (categoryId: string) => (
    <CategoryContents categoryId={categoryId} language={filter} />
  );
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
    <div className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("decks.appDecksTitle")}</h1>
        <nav className="flex gap-4 text-sm text-indigo-600">
          <Link to={`/library?language=${language}`}>
            {t("libraryHub.title")}
          </Link>
          <Link to="/">{t("library.myDecks")}</Link>
        </nav>
      </header>
      <ContentLanguageSwitcher value={language} onChange={choose} />

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
        <AppDecksSearchResults
          key={`${activeQuery}:${language}`}
          q={activeQuery}
          language={filter}
        />
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
                <CategorySection
                  key={`${category.id}:${language}`}
                  category={category}
                  getItemCount={getOfficialCount}
                  renderContents={renderOfficialContents}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
