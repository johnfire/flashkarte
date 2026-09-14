import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError, BrowseParams } from "../api/client";
import { LibraryDeck } from "../api/types";
import { usePaginatedList } from "../hooks/use-paginated-list";
import { LibraryDeckRow } from "./LibraryDeckRow";

interface LibrarySearchResultsProps {
  q: string;
  cloningId: string | null;
  onClone: (id: string) => void;
}

/**
 * Flat, cross-category search results for the Library page — ignores
 * category grouping so a search reaches every public deck regardless of
 * where it's filed, mirroring AppDecksSearchResults. `q` is the query at
 * mount time; later changes re-search in place.
 */
export function LibrarySearchResults({
  q,
  cloningId,
  onClone,
}: LibrarySearchResultsProps) {
  const { t } = useTranslation();

  const loadDecks = useCallback(
    (params: BrowseParams) => api.library.list(params),
    [],
  );
  const decks = usePaginatedList<LibraryDeck>(loadDecks, 30, q);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void decks.search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const errorMessage =
    decks.error instanceof ApiError
      ? decks.error.message
      : decks.error
        ? t("library.loadError")
        : null;

  return (
    <>
      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}
      {decks.items && decks.items.length === 0 && !errorMessage && (
        <p className="text-gray-500 dark:text-gray-400">{t("library.empty")}</p>
      )}
      <ul className="space-y-2">
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
    </>
  );
}
