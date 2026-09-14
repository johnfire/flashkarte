import { DeckCategory } from "../../api/types";

export interface CategoryOption {
  id: string;
  label: string;
}

/**
 * Flattens the two-level category tree into a flat, alphabetically-ordered
 * picker list ("Category" / "Category › Subcategory"), for both the admin
 * category-management tree and the deck/collection assignment dropdown.
 * Drops the synthetic "uncategorized" node — it isn't a real, manageable
 * category row.
 */
export function flattenCategoryOptions(
  categories: DeckCategory[],
): CategoryOption[] {
  const options: CategoryOption[] = [];
  for (const category of categories) {
    if (category.id === "uncategorized") continue;
    options.push({ id: category.id, label: category.title });
    for (const sub of category.subcategories) {
      options.push({ id: sub.id, label: `${category.title} › ${sub.title}` });
    }
  }
  return options;
}
