import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import { ContentLanguageField } from "../components/ContentLanguageSwitcher";

export function FlashcardCourseImportPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [contentLanguage, setContentLanguage] = useState<
    "en" | "de" | "ar" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitImport(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const imported = await api.imports.flashcardCourse(
        file,
        contentLanguage ?? undefined,
      );
      navigate(`/courses/${imported.course.id}`);
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : t("imports.courseError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-4 sm:p-8">
      <Link to="/courses/decks" className="text-sm text-indigo-600">
        {t("imports.backToCourses")}
      </Link>
      <h1 className="mt-3 text-3xl font-bold">{t("imports.courseTitle")}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {t("imports.courseIntro")}
      </p>

      <section
        className="mt-6 grid gap-4 sm:grid-cols-2"
        aria-label={t("imports.formatsLabel")}
      >
        <article className="rounded-xl border p-4">
          <h2 className="font-semibold">{t("imports.workbookTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t("imports.workbookDescription")}
          </p>
        </article>
        <article className="rounded-xl border p-4">
          <h2 className="font-semibold">{t("imports.zipTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t("imports.zipDescription")}
          </p>
        </article>
      </section>

      <section className="mt-6 rounded-xl bg-indigo-50 p-4 dark:bg-indigo-950/40">
        <h2 className="font-semibold">{t("imports.columnsTitle")}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          <li>{t("imports.courseColumns")}</li>
          <li>{t("imports.deckColumns")}</li>
          <li>{t("imports.cardColumns")}</li>
        </ul>
        <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
          {t("imports.explanationHint")}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-indigo-700 dark:text-indigo-300">
          <a href="/templates/flashcard-course.csv" download>
            {t("imports.downloadCourse")}
          </a>
          <a href="/templates/flashcard-decks.csv" download>
            {t("imports.downloadDecks")}
          </a>
          <a href="/templates/flashcard-cards.csv" download>
            {t("imports.downloadCards")}
          </a>
        </div>
      </section>

      <form onSubmit={submitImport} className="mt-6 space-y-4">
        <ContentLanguageField
          value={contentLanguage}
          onChange={setContentLanguage}
        />
        <label className="block">
          <span className="mb-1 block font-medium">
            {t("imports.chooseFile")}
          </span>
          <input
            type="file"
            accept=".xlsx,.zip,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block text-sm"
          />
        </label>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("imports.draftHint")}
        </p>
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={!file || busy}
          className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? t("imports.importing") : t("imports.importCourse")}
        </button>
      </form>
    </main>
  );
}
