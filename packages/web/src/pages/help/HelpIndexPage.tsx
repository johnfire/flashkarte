import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDocumentHead } from "../../seo/useDocumentHead";

const TOPICS = [
  { path: "getting-started", key: "gettingStarted" },
  { path: "writing-decks", key: "writingDecks" },
  { path: "branching-decks", key: "branchingDecks" },
  { path: "studying", key: "studying" },
  { path: "ai", key: "ai" },
  { path: "sharing", key: "sharing" },
] as const;

export function HelpIndexPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("help.index.metaTitle"),
    description: t("help.index.metaDescription"),
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="mx-auto max-w-2xl rounded-xl bg-white dark:bg-gray-800 px-6 py-8 shadow sm:px-10">
        <Link to="/" className="text-sm text-indigo-600">
          {t("help.backToHome")}
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{t("help.index.title")}</h1>
        <p className="mt-3 text-gray-700 dark:text-gray-300">
          {t("help.index.intro")}
        </p>

        <ul className="mt-6 space-y-3">
          {TOPICS.map(({ path, key }) => (
            <li key={path}>
              <Link
                to={`/help/${path}`}
                className="block rounded-lg border p-4 hover:border-indigo-400 dark:border-gray-700"
              >
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {t(`help.index.topics.${key}.title`)}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {t(`help.index.topics.${key}.description`)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
