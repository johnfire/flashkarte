import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export function LandingSchoolTeacherCallout() {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby="schools-teachers-title"
      className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-8 text-center shadow-lg shadow-indigo-950/20 backdrop-blur-sm sm:p-10"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-200">
        {t("landing.schoolTeacherCalloutEyebrow")}
      </p>
      <h2
        id="schools-teachers-title"
        className="mt-3 text-2xl font-bold text-white sm:text-3xl"
      >
        {t("landing.schoolTeacherCalloutTitle")}
      </h2>
      <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-slate-200">
        {t("landing.schoolTeacherCalloutBody")}
      </p>
      <Link
        to="/schools-and-teachers"
        className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-slate-950"
      >
        {t("landing.schoolTeacherCalloutCta")}
      </Link>
    </section>
  );
}
