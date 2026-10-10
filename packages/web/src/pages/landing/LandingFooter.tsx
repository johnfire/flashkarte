import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LandingLegalInfo } from "./LandingLegalInfo";

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
      <LandingLegalInfo className="mt-4" />
    </footer>
  );
}
