import { useState } from "react";
import { useTranslation } from "react-i18next";
import { DeckCategory } from "../api/types";
import { CategoryContents } from "./CategoryContents";

interface CategorySectionProps {
  category: DeckCategory;
}

/**
 * One collapsible category or subcategory on the App Decks page. Its own
 * contents (collections + standalone decks placed directly on it) mount
 * lazily via CategoryContents only once expanded, so browsing the tree
 * doesn't fetch every category's contents up front.
 */
export function CategorySection({ category }: CategorySectionProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const title =
    category.id === "uncategorized" ? t("decks.uncategorized") : category.title;
  // The server only counts items placed directly on this node; badge shows
  // the total including its subcategories so a collapsed top-level category
  // doesn't look empty when all its items live one level down.
  const totalItemCount =
    category.itemCount +
    category.subcategories.reduce((sum, sub) => sum + sub.itemCount, 0);

  return (
    <li className="rounded-lg border">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="font-medium">{title}</span>
        <span className="shrink-0 text-sm text-gray-500 dark:text-gray-400">
          {t("decks.itemCount", { count: totalItemCount })}
        </span>
      </button>
      {expanded && (
        <div className="space-y-4 p-4 pt-0">
          {category.subcategories.length > 0 && (
            <ul className="space-y-3">
              {category.subcategories.map((sub) => (
                <CategorySection key={sub.id} category={sub} />
              ))}
            </ul>
          )}
          <CategoryContents categoryId={category.id} />
        </div>
      )}
    </li>
  );
}
