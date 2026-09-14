import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../api/client";
import { CategoryOption } from "./categoryOptions";

interface AssignableItemRowProps {
  title: string;
  categoryId: string | null;
  options: CategoryOption[];
  onAssign: (categoryId: string | null) => Promise<void>;
}

const NONE_VALUE = "";

/** One deck/collection row with a category dropdown, used by CategoryAssignPanel. */
export function AssignableItemRow({
  title,
  categoryId,
  options,
  onAssign,
}: AssignableItemRowProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState(categoryId ?? NONE_VALUE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: string) {
    const prev = value;
    setValue(next);
    setSaving(true);
    setError(null);
    try {
      await onAssign(next === NONE_VALUE ? null : next);
    } catch (err) {
      setValue(prev);
      setError(
        err instanceof ApiError
          ? err.message
          : t("admin.categories.assignError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-2">
      <span className="min-w-0 truncate text-sm">{title}</span>
      <span className="flex shrink-0 items-center gap-2">
        <select
          value={value}
          disabled={saving}
          onChange={(e) => void onChange(e.target.value)}
          className="rounded-lg border bg-white px-2 py-1 text-sm dark:bg-gray-800"
        >
          <option value={NONE_VALUE}>{t("admin.categories.assignNone")}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </span>
    </li>
  );
}
