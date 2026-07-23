import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function LandingFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mt-20 text-center text-sm text-slate-400">
      <Link
        to="/login?mode=signup"
        className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
      >
        {t("landing.startStudying")}
      </Link>
      <p className="mt-4 space-x-4 text-xs text-slate-500">
        <Link to="/help" className="hover:text-slate-300">
          {t("common.help")}
        </Link>
        <Link to="/privacy" className="hover:text-slate-300">
          {t("common.privacy")}
        </Link>
        <Link to="/impressum" className="hover:text-slate-300">
          {t("common.impressum")}
        </Link>
      </p>
      <p className="mt-4 text-xs text-slate-500">
        {t("landing.productOf")}{" "}
        <a
          href="https://christopherrehm.de"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-300"
        >
          Rehm Consulting
        </a>
      </p>
    </footer>
  );
}
