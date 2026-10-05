import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function AuthFooter() {
  const { t } = useTranslation();
  return (
    <p className="space-x-4 text-center text-xs text-gray-600 dark:text-gray-400">
      {["help", "privacy", "impressum"].map((page) => (
        <Link
          key={page}
          to={`/${page}`}
          className="hover:text-gray-600 dark:hover:text-gray-300"
        >
          {t(`common.${page}`)}
        </Link>
      ))}
    </p>
  );
}
