import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, BrowseParams } from "../api/client";
import { LibraryDeck } from "../api/types";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { LibraryDeckRow } from "./LibraryDeckRow";

interface LibraryCategoryContentsProps {
  categoryId: string;
  cloningId: string | null;
  onClone: (id: string) => void;
}

/**
 * The public decks placed directly on one category or subcategory — the
 * expanded body of a CategorySection on the Library page. Mounted only
 * while that section is expanded, mirroring CategoryContents on App Decks.
 */
export function LibraryCategoryContents({
  categoryId,
  cloningId,
  onClone,
}: LibraryCategoryContentsProps) {
  const { t } = useTranslation();

  const loadDecks = useCallback(
    (params: BrowseParams) => api.library.list({ ...params, categoryId }),
    [categoryId],
  );
  const decks = usePaginatedList<LibraryDeck>(loadDecks);

  const errorMessage =
    decks.error instanceof ApiError
      ? decks.error.message
      : decks.error
        ? t("library.loadError")
        : null;

  return (
    <div className="space-y-3 border-l pl-4">
      {decks.loading && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {errorMessage && <p className="text-red-600">{errorMessage}</p>}
      {decks.items && decks.items.length === 0 && !errorMessage && (
        <p className="text-gray-500 dark:text-gray-400">{t("library.empty")}</p>
      )}
      <ul className="content-card-grid">
        {decks.items?.map((d) => (
          <LibraryDeckRow
            key={d.id}
            deck={d}
            busy={cloningId === d.id}
            onClone={onClone}
          />
        ))}
      </ul>
      {decks.hasMore && decks.items && (
        <button
          onClick={() => void decks.loadMore()}
          disabled={decks.loadingMore}
          className="mt-3 text-sm text-indigo-600 disabled:opacity-50"
        >
          {decks.loadingMore ? t("decks.loadingMore") : t("decks.loadMore")}
        </button>
      )}
    </div>
  );
}
