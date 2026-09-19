import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import type { LessonScreens } from "../api/learn-types";
import { LessonBlocks } from "./LessonBlocks";

/** Open book: while answering, the learner may reopen the lesson's screens. This is learning, not an exam. */
export function OpenBook({
  subjectId,
  slug,
}: {
  subjectId: string;
  slug: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [screens, setScreens] = useState<LessonScreens | null>(null);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && !screens) {
      try {
        setScreens(await api.learn.screens(subjectId, slug));
        setFailed(false);
      } catch {
        setFailed(true);
      }
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="open-book"
        onClick={toggle}
        className="text-sm text-indigo-700 underline dark:text-indigo-300"
      >
        {open ? t("learn.hideScreens") : t("learn.showScreens")}
      </button>
      {open && (
        <div id="open-book" className="mt-3 space-y-6 rounded-xl border p-4">
          {failed && <p role="alert">{t("learn.loadError")}</p>}
          {screens?.screens.map((screen) => (
            <section
              key={screen.number}
              aria-label={t("learn.screenNumber", { number: screen.number })}
            >
              <p className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                {t("learn.screenNumber", { number: screen.number })}
              </p>
              <LessonBlocks blocks={screen.blocks} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
