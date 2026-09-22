import { Link } from "react-router";
import { useTranslation } from "react-i18next";

const librarySections = [
  {
    titleKey: "libraryHub.officialCoursesTitle",
    detailKey: "libraryHub.officialCoursesDetail",
    to: "/library/courses/official",
  },
  {
    titleKey: "libraryHub.officialDecksTitle",
    detailKey: "libraryHub.officialDecksDetail",
    to: "/library/official/decks",
  },
  {
    titleKey: "libraryHub.communityCoursesTitle",
    detailKey: "libraryHub.communityCoursesDetail",
    to: "/library/courses/community",
  },
  {
    titleKey: "libraryHub.communityDecksTitle",
    detailKey: "libraryHub.communityDecksDetail",
    to: "/library/community/decks",
  },
];

export function LibraryHubPage() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{t("libraryHub.title")}</h1>
        <nav
          aria-label={t("libraryHub.navigation")}
          className="flex gap-3 text-sm text-indigo-600"
        >
          <Link to="/learn">{t("libraryHub.myCourses")}</Link>
          <Link to="/">{t("libraryHub.myDecks")}</Link>
        </nav>
      </header>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {librarySections.map((section) => (
          <li key={section.to}>
            <Link
              to={section.to}
              className="block rounded-lg border p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <h2 className="font-semibold">{t(section.titleKey)}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t(section.detailKey)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
