import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";

interface AddCategoryFormProps {
  parentId?: string;
  onAdded: () => void;
}

/** Create-category form, reused for both a top-level category and a subcategory (via `parentId`). */
export function AddCategoryForm({ parentId, onAdded }: AddCategoryFormProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setAdding(true);
    setError(null);
    try {
      await api.admin.createCategory(trimmed, parentId);
      setTitle("");
      onAdded();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("admin.categories.createError"),
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t(
          parentId
            ? "admin.categories.newSubcategoryPlaceholder"
            : "admin.categories.newCategoryPlaceholder",
        )}
        className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={adding || !title.trim()}
        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {adding
          ? t("admin.categories.adding")
          : t(
              parentId
                ? "admin.categories.addSubcategory"
                : "admin.categories.addCategory",
            )}
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </form>
  );
}
