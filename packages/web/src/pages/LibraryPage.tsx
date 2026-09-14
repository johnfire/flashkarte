import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { DeckCategory } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { CategorySection } from "./CategorySection";
import { LibraryCategoryContents } from "./LibraryCategoryContents";
import { LibrarySearchResults } from "./LibrarySearchResults";

const getPublicCount = (category: DeckCategory) => category.publicCount;

export function LibraryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

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

  async function onClone(id: string) {
    setCloningId(id);
    setCloneError(null);
    try {
      const deck = await api.library.clone(id);
      navigate(`/decks/${deck.id}/study`);
    } catch (err) {
      setCloneError(
        err instanceof ApiError ? err.message : t("library.cloneError"),
      );
      setCloningId(null);
    }
  }

  const renderPublicContents = useCallback(
    (categoryId: string) => (
      <LibraryCategoryContents
        categoryId={categoryId}
        cloningId={cloningId}
        onClone={onClone}
      />
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cloningId],
  );

  const treeErrorMessage =
    treeError instanceof ApiError
      ? treeError.message
      : treeError
        ? t("decks.categoriesLoadError")
        : null;

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

      <form onSubmit={onSearchSubmit} className="mb-6 flex gap-2">
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

      {cloneError && <p className="mb-4 text-red-600">{cloneError}</p>}

      {activeQuery !== null ? (
        <LibrarySearchResults
          q={activeQuery}
          cloningId={cloningId}
          onClone={onClone}
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
                  key={category.id}
                  category={category}
                  getItemCount={getPublicCount}
                  renderContents={renderPublicContents}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
