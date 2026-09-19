import { useTranslation } from "react-i18next";
import type { AddedInAnswer, ScreenSource } from "../api/learn-types";

/** Only links a person can safely follow: https, opened away from this page. */
const isWebLink = (url: string | undefined): url is string =>
  !!url && /^https:\/\//i.test(url);

/**
 * Where a screen came from. One added in answer to a "need more" request says so (and who wrote
 * it); any screen with sources lists them, tucked away until wanted.
 */
export function ScreenOrigin({
  addedInAnswer,
  sources,
}: {
  addedInAnswer: AddedInAnswer;
  sources: ScreenSource[] | null;
}) {
  const { t } = useTranslation();
  const list = sources ?? [];
  if (!addedInAnswer && list.length === 0) return null;
  return (
    <div className="mt-4 space-y-1 text-xs text-gray-700 dark:text-gray-300">
      {addedInAnswer && (
        <p className="font-medium">
          {t(
            addedInAnswer === "ai" ? "learn.addedByAi" : "learn.addedInAnswer",
          )}
        </p>
      )}
      {list.length > 0 && (
        <details>
          <summary className="cursor-pointer">
            {t("learn.sources", { count: list.length })}
          </summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {list.map((source, index) => (
              <li key={index}>
                {isWebLink(source.url) ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {source.title}
                  </a>
                ) : (
                  source.title
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
