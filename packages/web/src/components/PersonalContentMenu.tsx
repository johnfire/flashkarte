import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

/** Common actions for a learner's personal decks and structured courses. */
export function PersonalContentMenu() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function signOut() {
    await logout();
    navigate("/login");
  }

  return (
    <nav
      aria-label={t("decks.personalContentMenu")}
      className="flex flex-wrap items-center gap-3"
    >
      <Link
        to="/decks/new"
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white"
      >
        {t("decks.newDeck")}
      </Link>
      <Link to="/library" className="text-sm text-gray-500 dark:text-gray-400">
        {t("decks.library")}
      </Link>
      <Link to="/help" className="text-sm text-gray-500 dark:text-gray-400">
        {t("common.help")}
      </Link>
      {user?.accountType === "admin" && (
        <Link to="/admin" className="text-sm text-gray-500 dark:text-gray-400">
          {t("decks.admin")}
        </Link>
      )}
      <Link to="/settings" className="text-sm text-gray-500 dark:text-gray-400">
        {t("decks.settings")}
      </Link>
      <button
        onClick={() => void signOut()}
        className="text-sm text-gray-500 dark:text-gray-400"
      >
        {t("decks.signOut")}
      </button>
    </nav>
  );
}
