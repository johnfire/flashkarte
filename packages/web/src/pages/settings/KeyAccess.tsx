import { useTranslation } from "react-i18next";
import type { ApiKeyScope } from "../../api/types";

const OPTIONS: {
  scope: ApiKeyScope;
  label: string;
  hint: string;
}[] = [
  {
    scope: "full",
    label: "settings.keyAccessFull",
    hint: "settings.keyAccessFullHint",
  },
  {
    scope: "deck",
    label: "settings.keyAccessAi",
    hint: "settings.keyAccessAiHint",
  },
];

interface KeyAccessChoiceProps {
  value: ApiKeyScope;
  onChange: (scope: ApiKeyScope) => void;
}

/** Which kind of key to create: the owner's own access, or an AI that builds decks and lessons. */
export function KeyAccessChoice({ value, onChange }: KeyAccessChoiceProps) {
  const { t } = useTranslation();
  return (
    <fieldset className="mt-3">
      <legend className="mb-1 text-sm font-medium">
        {t("settings.keyAccess")}
      </legend>
      {OPTIONS.map((option) => (
        <label
          key={option.scope}
          className="mb-2 flex cursor-pointer items-start gap-2 text-sm"
        >
          <input
            type="radio"
            name="key-access"
            value={option.scope}
            checked={value === option.scope}
            onChange={() => onChange(option.scope)}
            className="mt-1"
          />
          <span>
            <span className="font-medium">{t(option.label)}</span>
            <br />
            <span className="text-gray-600 dark:text-gray-300">
              {t(option.hint)}
            </span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** A small tag on a listed key, so an AI authoring key can be told from a full-access one. */
export function KeyScopeBadge({ scope }: { scope: ApiKeyScope }) {
  const { t } = useTranslation();
  return (
    <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-700 dark:bg-gray-700 dark:text-gray-200">
      {t(scope === "deck" ? "settings.keyAccessAi" : "settings.keyAccessFull")}
    </span>
  );
}
