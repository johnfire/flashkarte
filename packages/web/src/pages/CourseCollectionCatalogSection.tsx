import { useCallback } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { CourseCollectionSummary } from "../api/learn-types";
import { useAsync } from "../hooks/use-async";

type CourseSource = "official" | "community";

interface CourseCollectionCatalogSectionProps {
  source: CourseSource;
  language?: "en" | "de" | "ar";
  selectedLanguage?: string;
}

function sectionTitle(source: CourseSource): string {
  return source === "official"
    ? "libraryHub.officialCourseCollections"
    : "libraryHub.communityCourseCollections";
}

/** Collection cards provide the first level of structured-course discovery. */
export function CourseCollectionCatalogSection({
  source,
  language,
  selectedLanguage,
}: CourseCollectionCatalogSectionProps) {
  const { t } = useTranslation();
  const loadCollections = useCallback(
    () => api.courseCollections.list(source, language),
    [language, source],
  );
  const { data: collections, error } = useAsync<CourseCollectionSummary[], []>(
    loadCollections,
    [],
  );
  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? t("courseCatalog.loadError")
        : null;

  if (!errorMessage && collections?.length === 0) return null;
  return (
    <section aria-labelledby={`${source}-course-collections-heading`}>
      <h2
        id={`${source}-course-collections-heading`}
        className="mb-3 text-xl font-semibold"
      >
        {t(sectionTitle(source))}
      </h2>
      {errorMessage && (
        <p role="alert" className="text-red-600">
          {errorMessage}
        </p>
      )}
      <ul className="content-card-grid">
        {collections?.map((collection) => (
          <li key={collection.id} className="rounded-xl border">
            <Link
              to={`/library/courses/${source}/collections/${collection.id}${selectedLanguage ? `?language=${selectedLanguage}` : ""}`}
              className="block rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <h3 className="text-lg font-semibold">{collection.title}</h3>
              {collection.description && (
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {collection.description}
                </p>
              )}
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                {t("courseCollections.courseCount", {
                  count: collection.course_count,
                })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
