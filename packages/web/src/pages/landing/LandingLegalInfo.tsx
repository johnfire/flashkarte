import { Link } from "react-router";
import { useTranslation } from "react-i18next";

interface LandingLegalInfoProps {
  className?: string;
}

export function LandingLegalInfo({ className }: LandingLegalInfoProps) {
  const { t } = useTranslation();
  return (
    <div className={className}>
      <p className="space-x-4 text-xs text-slate-500">
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
        <a
          href="https://christopherrehm.de"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-300"
        >
          {t("landing.productOf")} Rehm Consulting
        </a>
      </p>
    </div>
  );
}
