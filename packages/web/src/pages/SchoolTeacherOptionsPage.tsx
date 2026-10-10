import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useDocumentHead } from "../seo/useDocumentHead";

const AUDIENCES = ["schools", "schoolTeachers", "independentTeachers"] as const;

export function SchoolTeacherOptionsPage() {
  const { t } = useTranslation();
  useDocumentHead({
    title: t("schoolTeacherPage.metaTitle"),
    description: t("schoolTeacherPage.metaDescription"),
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm font-medium text-indigo-200 hover:text-white hover:underline"
          >
            {t("schoolTeacherPage.backToHome")}
          </Link>
          <LanguageSwitcher compact onDark />
        </div>

        <header className="mx-auto mt-16 max-w-3xl text-center sm:mt-20">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-200">
            {t("schoolTeacherPage.eyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {t("schoolTeacherPage.title")}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-300">
            {t("schoolTeacherPage.intro")}
          </p>
        </header>

        <section
          aria-label={t("schoolTeacherPage.audiencesLabel")}
          className="mt-14 grid gap-6 md:grid-cols-3"
        >
          {AUDIENCES.map((audience) => (
            <article
              key={audience}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm"
            >
              <h2 className="text-xl font-semibold text-white">
                {t(`schoolTeacherPage.${audience}Title`)}
              </h2>
              <p className="mt-3 leading-relaxed text-slate-300">
                {t(`schoolTeacherPage.${audience}Body`)}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-14 rounded-2xl border border-white/10 bg-white/5 p-7 sm:p-10">
          <h2 className="text-2xl font-bold text-white">
            {t("schoolTeacherPage.createContentTitle")}
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">
            {t("schoolTeacherPage.createContentBody")}
          </p>
          <Link
            to="/help/importing-content"
            className="mt-5 inline-flex font-medium text-indigo-200 underline underline-offset-4 hover:text-white"
          >
            {t("schoolTeacherPage.createContentGuideCta")}
          </Link>
        </section>

        <section className="mx-auto mt-14 max-w-3xl rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-8 text-center sm:p-10">
          <h2 className="text-2xl font-bold text-white">
            {t("schoolTeacherPage.gettingStartedTitle")}
          </h2>
          <p className="mt-4 leading-relaxed text-slate-200">
            {t("schoolTeacherPage.gettingStartedBody")}
          </p>
          <a
            href="mailto:contact@christopherrehm.de?subject=LearnWohl%20for%20schools%20and%20teachers"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            {t("schoolTeacherPage.contactCta")}
          </a>
        </section>
      </div>
    </main>
  );
}
