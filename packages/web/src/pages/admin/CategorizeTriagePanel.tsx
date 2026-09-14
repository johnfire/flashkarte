import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import {
  DeckCategory,
  DeckCollection,
  LibraryDeck,
  OfficialDeck,
} from "../../api/types";
import { flattenCategoryOptions } from "./categoryOptions";
import { UncategorizedList } from "./UncategorizedList";

interface CategorizeTriagePanelProps {
  categories: DeckCategory[];
}

/**
 * Fast triage flow for newly-added content: pick a target category once,
 * then click any uncategorized collection/deck below to file it there
 * instantly — no per-item search or dropdown. The search-driven Assign
 * panel below this one still covers recategorizing something specific.
 */
export function CategorizeTriagePanel({
  categories,
}: CategorizeTriagePanelProps) {
  const { t } = useTranslation();
  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const options = flattenCategoryOptions(categories);

  const totalRemaining = Object.values(counts).reduce((a, b) => a + b, 0);
  const allReported = Object.keys(counts).length === 3;

  return (
    <div>
      <h3 className="mb-1 font-semibold">{t("admin.categories.quickTitle")}</h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        {t("admin.categories.quickHint")}
      </p>

      <label className="mb-3 flex items-center gap-2 text-sm">
        {t("admin.categories.quickTargetLabel")}
        <select
          value={targetCategoryId ?? ""}
          onChange={(e) => setTargetCategoryId(e.target.value || null)}
          className="rounded-lg border bg-white px-2 py-1 dark:bg-gray-800"
        >
          <option value="">
            {t("admin.categories.quickTargetPlaceholder")}
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {allReported && totalRemaining === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("admin.categories.quickEmpty")}
        </p>
      ) : (
        <>
          <UncategorizedList<DeckCollection>
            heading={t("admin.categories.assignCollectionsHeading")}
            targetCategoryId={targetCategoryId}
            loadItems={api.decks.listCollections}
            detailText={(c) => t("decks.deckCount", { count: c.deck_count })}
            onAssign={(id, categoryId) =>
              api.admin.setCollectionCategory(id, categoryId)
            }
            onCountChange={(n) => setCounts((c) => ({ ...c, collections: n }))}
          />
          <UncategorizedList<OfficialDeck>
            heading={t("admin.categories.assignDecksHeading")}
            targetCategoryId={targetCategoryId}
            loadItems={api.decks.listOfficial}
            detailText={(d) => t("decks.cardCount", { count: d.card_count })}
            onAssign={(id, categoryId) =>
              api.admin.setDeckCategory(id, categoryId)
            }
            onCountChange={(n) => setCounts((c) => ({ ...c, official: n }))}
          />
          <UncategorizedList<LibraryDeck>
            heading={t("admin.categories.assignLibraryHeading")}
            targetCategoryId={targetCategoryId}
            loadItems={api.library.list}
            detailText={(d) =>
              t("library.cardsByAuthor", {
                count: d.cardCount,
                author: d.author,
              })
            }
            onAssign={(id, categoryId) =>
              api.admin.setDeckCategory(id, categoryId)
            }
            onCountChange={(n) => setCounts((c) => ({ ...c, library: n }))}
          />
        </>
      )}
    </div>
  );
}
