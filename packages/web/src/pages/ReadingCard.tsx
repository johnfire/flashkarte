import { useTranslation } from "react-i18next";
import { CardText } from "../components/CardText";

interface ReadingCardProps {
  cardNumberLabel: string;
  category: string | null;
  title: string;
  body: string;
  onGotIt: () => void;
}

/**
 * A lesson: a title and a body to read, then "Got it". Not graded and not
 * scheduled, so there is nothing to reveal and no rating buttons. The body is
 * shown as written (paragraphs and list lines keep their line breaks).
 */
export function ReadingCard({
  cardNumberLabel,
  category,
  title,
  body,
  onGotIt,
}: ReadingCardProps) {
  const { t } = useTranslation();
  return (
    <>
      <article className="rounded-xl border p-8 shadow-sm">
        <p className="mb-2 text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {t("study.reading")} · {cardNumberLabel}
          {category && ` · ${category}`}
        </p>
        <h2 className="text-lg font-semibold">
          <CardText text={title} />
        </h2>
        <div className="mt-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
          <CardText text={body} />
        </div>
        <p className="mt-6 text-xs text-gray-600 dark:text-gray-400">
          {t("study.readingHint")}
        </p>
      </article>
      <button
        type="button"
        onClick={onGotIt}
        className="mt-4 w-full rounded-lg bg-indigo-600 py-3 font-medium text-white"
      >
        {t("study.gotIt")}
      </button>
    </>
  );
}
