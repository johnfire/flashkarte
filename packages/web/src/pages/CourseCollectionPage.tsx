import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { LearnSubject } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";
import {
  contentLanguageLabel,
  ContentLanguageSwitcher,
} from "../components/ContentLanguageSwitcher";
import { useContentLanguage } from "../hooks/use-content-language";

function sourceFromParam(source: string | undefined): "official" | "community" {
  return source === "community" ? "community" : "official";
}

/** A Library collection and the public structured courses it contains. */
export function CourseCollectionPage() {
  const { t } = useTranslation();
  const { id, source: sourceParam } = useParams();
  const source = sourceFromParam(sourceParam);
  const location = useLocation();
  const navigate = useNavigate();
  const { language, choose } = useContentLanguage("library");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const loadCollection = useCallback(
    () =>
      api.courseCollections.get(
        id!,
        source,
        language === "all" ? undefined : language,
      ),
    [id, language, source],
  );
  const { data: collection, error, loading } = useAsync(loadCollection, []);

  async function enroll(course: LearnSubject) {
    setEnrollingId(course.id);
    try {
      await api.learn.enroll(course.id);
      navigate(`/learn/${course.id}`);
    } finally {
      setEnrollingId(null);
    }
  }

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? t("courseCatalog.loadError")
        : null;
  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <Link
        to={`/library${location.search}`}
        className="mb-3 inline-block text-sm text-indigo-600"
      >
        {t("courseCollections.backToLibrary")}
      </Link>
      {loading && <p>{t("common.loading")}</p>}
      {errorMessage && (
        <p role="alert" className="text-red-600">
          {errorMessage}
        </p>
      )}
      {collection && (
        <>
          <header className="mb-6">
            <h1 className="text-3xl font-bold">{collection.title}</h1>
            {collection.description && (
              <p className="mt-2 text-gray-700 dark:text-gray-300">
                {collection.description}
              </p>
            )}
          </header>
          <ContentLanguageSwitcher value={language} onChange={choose} />
          {collection.courses.length === 0 ? (
            <p>{t("courseCollections.emptyInLanguage")}</p>
          ) : (
            <ul className="mt-6 content-card-grid">
              {collection.courses.map((course) => (
                <li key={course.id} className="rounded-xl border p-4">
                  <h2 className="font-medium">
                    {course.title}
                    {contentLanguageLabel(course.locale) && (
                      <span className="ml-2 text-xs font-normal">
                        {contentLanguageLabel(course.locale)}
                      </span>
                    )}
                  </h2>
                  {course.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {course.description}
                    </p>
                  )}
                  <button
                    disabled={enrollingId === course.id}
                    onClick={() => void enroll(course)}
                    className="mt-3 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                  >
                    {enrollingId === course.id
                      ? t("courseCatalog.adding")
                      : t("courseCatalog.add")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
