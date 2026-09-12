import { useCallback, useEffect, useState } from "react";

interface PageRequest {
  q: string | undefined;
  limit: number;
  offset: number;
}

/**
 * A searchable, "load more"-paginated list. Shared by the App Decks browse
 * pages, which may eventually page through thousands of rows — the caller
 * supplies the actual fetch (one collection's decks, all collections, or
 * standalone decks); this just tracks accumulated items, search text, and
 * whether another page might exist.
 */
export function usePaginatedList<T>(
  loadPage: (params: PageRequest) => Promise<T[]>,
  pageSize = 30,
) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<T[] | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const search = useCallback(
    async (query: string) => {
      setQ(query);
      setLoading(true);
      setError(null);
      try {
        const page = await loadPage({
          q: query || undefined,
          limit: pageSize,
          offset: 0,
        });
        setItems(page);
        setHasMore(page.length === pageSize);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [loadPage, pageSize],
  );

  const loadMore = useCallback(async () => {
    if (!items || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await loadPage({
        q: q || undefined,
        limit: pageSize,
        offset: items.length,
      });
      setItems((prev) => (prev ? [...prev, ...page] : page));
      setHasMore(page.length === pageSize);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingMore(false);
    }
  }, [items, loadingMore, loadPage, pageSize, q]);

  useEffect(() => {
    void search("");
    // Only ever run on mount; `search("")` re-runs explicitly on user action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    q,
    items,
    hasMore,
    loading,
    loadingMore,
    error,
    search,
    loadMore,
    setItems,
  };
}
