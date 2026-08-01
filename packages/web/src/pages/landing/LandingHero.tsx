import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function LandingHero() {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-900/50">
        fk
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        {t("landing.heroTitle")}
      </h1>
      <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
        {t("landing.heroBody")}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/login?mode=signup"
          className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500"
        >
          {t("landing.signupCta")}
        </Link>
        <Link
          to="/login"
          className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 font-medium text-slate-200 backdrop-blur-sm transition hover:bg-white/10"
        >
          {t("landing.signin")}
        </Link>
      </div>
    </div>
  );
}
