import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import { DeckCategory } from "../../api/types";

interface CategoryRowProps {
  category: DeckCategory;
  onChanged: () => void;
}

/** One category/subcategory row: rename-in-place and delete. */
export function CategoryRow({ category, onChanged }: CategoryRowProps) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(category.title);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || trimmed === category.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.admin.renameCategory(category.id, trimmed);
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("admin.categories.renameError"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        t("admin.categories.deleteConfirm", { title: category.title }),
      )
    )
      return;
    setError(null);
    try {
      await api.admin.deleteCategory(category.id);
      onChanged();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t("admin.categories.deleteError"),
      );
    }
  }

  if (editing) {
    return (
      <form onSubmit={onRename} className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          className="flex-1 rounded-lg border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="shrink-0 text-sm text-indigo-600 disabled:opacity-50"
        >
          {t("admin.categories.save")}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </form>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span>
        {category.title}{" "}
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({category.itemCount})
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 text-sm">
        <button
          onClick={() => {
            setTitle(category.title);
            setEditing(true);
          }}
          className="text-indigo-600"
        >
          {t("admin.categories.rename")}
        </button>
        <button onClick={onDelete} className="text-red-600">
          {t("admin.categories.delete")}
        </button>
      </span>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
