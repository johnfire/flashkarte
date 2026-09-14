import { useTranslation } from "react-i18next";
import { DeckCategory } from "../../api/types";
import { CategoryRow } from "./CategoryRow";
import { AddCategoryForm } from "./AddCategoryForm";

interface CategoriesPanelProps {
  categories: DeckCategory[];
  onChanged: () => void;
}

/** Two-level category tree management: create, rename, delete. */
export function CategoriesPanel({
  categories,
  onChanged,
}: CategoriesPanelProps) {
  const { t } = useTranslation();
  const topLevel = categories.filter((c) => c.id !== "uncategorized");

  return (
    <div>
      <h3 className="mb-3 font-semibold">{t("admin.categories.title")}</h3>
      {topLevel.length === 0 && (
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          {t("admin.categories.empty")}
        </p>
      )}
      <ul className="mb-4 space-y-4">
        {topLevel.map((category) => (
          <li key={category.id} className="rounded-lg border p-3">
            <CategoryRow category={category} onChanged={onChanged} />
            {category.subcategories.length > 0 && (
              <ul className="mt-3 ml-4 space-y-2 border-l pl-3">
                {category.subcategories.map((sub) => (
                  <li key={sub.id}>
                    <CategoryRow category={sub} onChanged={onChanged} />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 ml-4">
              <AddCategoryForm parentId={category.id} onAdded={onChanged} />
            </div>
          </li>
        ))}
      </ul>
      <AddCategoryForm onAdded={onChanged} />
    </div>
  );
}
