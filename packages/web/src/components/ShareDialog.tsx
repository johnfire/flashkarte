import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../api/client";
import type { DeckSharing, ShareOptions, ShareScope } from "../api/types";

export type ShareRequest = { scope: ShareScope; classId?: string }[];

interface ShareDialogProps {
  itemTitle: string;
  // How to read and replace this item's audiences (deck, course or
  // structured course — the server applies the same rules to all three).
  load: () => Promise<DeckSharing>;
  save: (shares: ShareRequest) => Promise<unknown>;
  onClose: () => void;
}

type Selection = {
  school: boolean;
  allStudents: boolean;
  classIds: Set<string>;
};

/**
 * Who in the owner's school or classes can use a deck or course. "Everyone" (public)
 * stays on its own Share button; this covers the narrower audiences, and
 * offers only the ones this account kind is allowed (the server enforces the
 * same rules).
 */
export function ShareDialog({
  itemTitle,
  load,
  save: saveShares,
  onClose,
}: ShareDialogProps) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ShareOptions | null>(null);
  const [selection, setSelection] = useState<Selection>({
    school: false,
    allStudents: false,
    classIds: new Set(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    load()
      .then((result) => {
        if (!active) return;
        setOptions(result.options);
        setSelection({
          school: result.shares.some((s) => s.scope === "school"),
          allStudents: result.shares.some(
            (s) => s.scope === "teacher_students",
          ),
          classIds: new Set(
            result.shares
              .filter((s) => s.scope === "class" && s.classId)
              .map((s) => s.classId as string),
          ),
        });
      })
      .catch((failure) => {
        if (!active) return;
        setError(
          failure instanceof ApiError
            ? failure.message
            : t("decks.sharing.loadError"),
        );
      });
    return () => {
      active = false;
    };
    // Load once per open dialog; `load` is a fresh closure on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleClass(classId: string) {
    setSelection((current) => {
      const classIds = new Set(current.classIds);
      if (classIds.has(classId)) classIds.delete(classId);
      else classIds.add(classId);
      return { ...current, classIds };
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const shares: ShareRequest = [];
    if (selection.school) shares.push({ scope: "school" });
    if (selection.allStudents) shares.push({ scope: "teacher_students" });
    for (const classId of selection.classIds) {
      shares.push({ scope: "class", classId });
    }
    try {
      await saveShares(shares);
      onClose();
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : t("decks.sharing.saveError"),
      );
      setSaving(false);
    }
  }

  const classLabel =
    options?.accountKind === "student"
      ? "decks.sharing.classmates"
      : "decks.sharing.class";
  const nothingToOffer =
    options !== null &&
    !options.canShareWithSchool &&
    !options.canShareWithAllStudents &&
    options.classes.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("decks.sharing.title", { title: itemTitle })}
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 dark:bg-gray-800">
        <h2 className="mb-1 text-xl font-semibold">
          {t("decks.sharing.title", { title: itemTitle })}
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {t("decks.sharing.hint")}
        </p>

        {!options && !error && (
          <p className="text-sm text-gray-500">{t("common.loading")}</p>
        )}
        {nothingToOffer && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t("decks.sharing.nothing")}
          </p>
        )}

        {options && (
          <fieldset className="grid gap-2 text-sm">
            {options.canShareWithSchool && options.school && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selection.school}
                  onChange={(e) =>
                    setSelection((s) => ({ ...s, school: e.target.checked }))
                  }
                />
                {t("decks.sharing.school", { name: options.school.name })}
              </label>
            )}
            {options.canShareWithAllStudents && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selection.allStudents}
                  onChange={(e) =>
                    setSelection((s) => ({
                      ...s,
                      allStudents: e.target.checked,
                    }))
                  }
                />
                {t("decks.sharing.allStudents")}
              </label>
            )}
            {options.classes.map((schoolClass) => (
              <label key={schoolClass.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selection.classIds.has(schoolClass.id)}
                  onChange={() => toggleClass(schoolClass.id)}
                />
                {t(classLabel, { name: schoolClass.name })}
              </label>
            ))}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !options || nothingToOffer}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? t("decks.sharing.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
