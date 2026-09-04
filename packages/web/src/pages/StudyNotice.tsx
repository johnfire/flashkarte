import { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

interface StudyNoticeProps {
  /** Heading. Omitted for the error state, which leads with the message. */
  title?: string;
  body: ReactNode;
  /** Error states render the message in red and the link unadorned. */
  tone?: "normal" | "error";
}

/**
 * The full-page panel a study session ends on: session complete, nothing due,
 * a load error, or a deck web cannot study. All of them are a short message
 * plus a way back to the decks, so they share one component.
 */
export function StudyNotice({
  title,
  body,
  tone = "normal",
}: StudyNoticeProps) {
  const { t } = useTranslation();
  const isError = tone === "error";
  return (
    <div className="mx-auto max-w-xl p-8 text-center">
      {title && <h1 className="mb-2 text-2xl font-bold">{title}</h1>}
      <p
        className={
          isError
            ? "mb-4 text-red-600"
            : "mb-6 text-gray-600 dark:text-gray-300"
        }
      >
        {body}
      </p>
      <Link
        to="/"
        className={
          isError
            ? "text-indigo-600"
            : "rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
        }
      >
        {t("study.backToDecks")}
      </Link>
    </div>
  );
}
