import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";

function tabClassName(isActive: boolean) {
  return isActive
    ? "rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
    : "rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800";
}

/** Switches between a learner's decks and their structured learning courses. */
export function PersonalContentTabs() {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t("decks.personalContentNavigation")}
      className="mb-6 flex w-fit gap-1 rounded-lg border p-1"
    >
      <NavLink to="/" end className={({ isActive }) => tabClassName(isActive)}>
        {t("decks.title")}
      </NavLink>
      <NavLink to="/learn" className={({ isActive }) => tabClassName(isActive)}>
        {t("decks.myCourses")}
      </NavLink>
    </nav>
  );
}
