import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import { DeckCategory, DeckCollection, OfficialDeck } from "../../api/types";
import { flattenCategoryOptions } from "./categoryOptions";
import { AssignableItemRow } from "./AssignableItemRow";

interface CategoryAssignPanelProps {
  categories: DeckCategory[];
}

/**
 * Search official decks and collections, then assign each a category via a
 * flat "Category" / "Category › Subcategory" dropdown. Lets Chris file
 * existing official content into categories without needing a promote/demote
 * UI — that flow stays API-only, out of scope here.
 */
export function CategoryAssignPanel({ categories }: CategoryAssignPanelProps) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [decks, setDecks] = useState<OfficialDeck[] | null>(null);
  const [collections, setCollections] = useState<DeckCollection[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = flattenCategoryOptions(categories);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const [deckResults, collectionResults] = await Promise.all([
        api.decks.listOfficial({ q, limit: 50 }),
        api.decks.listCollections({ q, limit: 50 }),
      ]);
      setDecks(deckResults);
      setCollections(collectionResults);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("admin.categories.assignError"),
      );
    } finally {
      setLoading(false);
    }
  }

  const isEmpty =
    decks !== null &&
    collections !== null &&
    decks.length === 0 &&
    collections.length === 0;

  return (
    <div>
      <h3 className="mb-3 font-semibold">
        {t("admin.categories.assignTitle")}
      </h3>
      <form onSubmit={onSearch} className="mb-3 flex gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("admin.categories.assignSearchPlaceholder")}
          className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {t("library.search")}
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {isEmpty && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("admin.categories.assignEmpty")}
        </p>
      )}

      {collections !== null && collections.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("admin.categories.assignCollectionsHeading")}
          </h4>
          <ul className="space-y-2">
            {collections.map((c) => (
              <AssignableItemRow
                key={c.id}
                title={c.title}
                categoryId={c.category_id}
                options={options}
                onAssign={(categoryId) =>
                  api.admin.setCollectionCategory(c.id, categoryId)
                }
              />
            ))}
          </ul>
        </div>
      )}

      {decks !== null && decks.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
            {t("admin.categories.assignDecksHeading")}
          </h4>
          <ul className="space-y-2">
            {decks.map((d) => (
              <AssignableItemRow
                key={d.id}
                title={d.title}
                categoryId={d.category_id}
                options={options}
                onAssign={(categoryId) =>
                  api.admin.setDeckCategory(d.id, categoryId)
                }
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
