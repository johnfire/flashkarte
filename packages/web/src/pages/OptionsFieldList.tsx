import { useTranslation } from "react-i18next";
import type { ParsedOption } from "@flashkarte/shared";

/**
 * Editor for a branch/diagnostic card's routed options. `availableTargets` is
 * shown as a hint, not enforced client-side — the server validates that every
 * `goto` resolves to a real label (or a reserved target like `end`/`correct`).
 */
export function OptionsFieldList({
  options,
  onChange,
  availableTargets,
}: {
  options: ParsedOption[];
  onChange: (next: ParsedOption[]) => void;
  availableTargets: string[];
}) {
  const { t } = useTranslation();

  function updateOption(index: number, patch: Partial<ParsedOption>) {
    onChange(options.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">
        {t("editCard.options")}
      </label>
      <datalist id="option-targets">
        {availableTargets.map((target) => (
          <option key={target} value={target} />
        ))}
      </datalist>
      <div className="space-y-2">
        {options.map((option, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="flex-1 rounded border px-2 py-1 dark:bg-gray-800"
              value={option.text}
              placeholder={t("editCard.optionText")}
              onChange={(e) => updateOption(i, { text: e.target.value })}
            />
            <input
              className="w-40 rounded border px-2 py-1 dark:bg-gray-800"
              value={option.goto}
              placeholder={t("editCard.optionTarget")}
              list="option-targets"
              onChange={(e) => updateOption(i, { goto: e.target.value })}
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, idx) => idx !== i))}
              className="text-sm text-red-600"
            >
              {t("editCard.removeOption")}
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...options, { text: "", goto: "" }])}
        className="mt-2 text-sm text-indigo-600"
      >
        {t("editCard.addOption")}
      </button>
    </div>
  );
}
