import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Block } from "@flashkarte/shared";
import type {
  AddedInAnswer,
  HelpNotice,
  ScreenSource,
} from "../api/learn-types";
import { CommentOnScreen } from "./CommentOnScreen";
import { LessonBlocks } from "./LessonBlocks";
import { NeedMoreOnThis } from "./NeedMoreOnThis";
import { ScreenOrigin } from "./ScreenOrigin";

/**
 * One numbered teaching screen: "Screen 3 of 8" and its small permanent number, with Back and Next.
 * Also used to re-teach after a miss, where the position reads "Re-read 1 of 2".
 */
export function ScreenView({
  subjectId,
  slug,
  number,
  sources,
  addedInAnswer,
  help,
  label,
  blocks,
  canGoBack,
  nextLabel,
  disabled,
  onBack,
  onNext,
  note,
}: {
  subjectId: string;
  /** The lesson's slug. Without it (a review) there is no "need more" button. */
  slug?: string;
  number: string;
  sources: ScreenSource[] | null;
  addedInAnswer: AddedInAnswer;
  help: HelpNotice[];
  label: string;
  blocks: Block[];
  canGoBack: boolean;
  nextLabel: string;
  disabled: boolean;
  onBack?: () => void;
  onNext: () => void;
  note?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement>(null);

  // A new screen starts at the top, and a screen reader is told where it is.
  useEffect(() => {
    window.scrollTo(0, 0);
    heading.current?.focus();
  }, [number, label]);

  return (
    <>
      <article className="rounded-xl border p-6 shadow-sm">
        <h2
          ref={heading}
          tabIndex={-1}
          className="mb-1 text-sm font-medium text-gray-700 outline-none dark:text-gray-300"
        >
          {label}
        </h2>
        <p className="mb-4 text-xs text-gray-600 dark:text-gray-400">
          {t("learn.screenNumber", { number })}
        </p>
        <LessonBlocks blocks={blocks} />
        <ScreenOrigin addedInAnswer={addedInAnswer} sources={sources} />
        {note}
        {slug && (
          <NeedMoreOnThis
            key={number}
            subjectId={subjectId}
            slug={slug}
            target={{ screen: number }}
            screenNumber={number}
            notices={help}
          />
        )}
        <CommentOnScreen subjectId={subjectId} number={number} />
      </article>
      <div className="mt-4 flex gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={disabled || !canGoBack}
            className="rounded-lg border px-6 py-3 font-medium disabled:opacity-50"
          >
            {t("learn.back")}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="flex-1 rounded-lg bg-indigo-600 py-3 font-medium text-white disabled:opacity-50"
        >
          {nextLabel}
        </button>
      </div>
    </>
  );
}
