import { useCallback, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { LearnSubject } from "../api/learn-types";
import { PersonalContentMenu } from "../components/PersonalContentMenu";
import { PersonalContentTabs } from "../components/PersonalContentTabs";
import { useAsync } from "../hooks/use-async";
import { useAuth } from "../auth/AuthContext";
import {
  ContentLanguageSwitcher,
  contentLanguageLabel,
} from "../components/ContentLanguageSwitcher";
import { useContentLanguage } from "../hooks/use-content-language";
import { LearnCourseCard } from "./LearnCourseCard";

/** /learn — the real courses a learner owns or has added, each opening on its outline. */
export function LearnPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { language, choose } = useContentLanguage("courses");
  const load = useCallback(() => api.learn.subjects(), []);
  const { data, error, loading, setData } = useAsync<LearnSubject[], []>(
    load,
    [],
  );
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [sharingError, setSharingError] = useState<string | null>(null);

  async function toggleCommunitySharing(course: LearnSubject) {
    setSharingId(course.id);
    setSharingError(null);
    try {
      const updated = await api.learn.setPublic(course.id, !course.is_public);
      setData((courses) =>
        courses
          ? courses.map((existing) =>
              existing.id === course.id
                ? { ...existing, is_public: updated.is_public }
                : existing,
            )
          : null,
      );
    } catch (failure) {
      setSharingError(
        failure instanceof ApiError ? failure.message : t("learn.shareError"),
      );
    } finally {
      setSharingId(null);
    }
  }

  async function changeLanguage(
    course: LearnSubject,
    locale: "en" | "de" | "ar",
  ) {
    try {
      await api.learn.setContentLanguage(course.id, locale);
      setData(
        (courses) =>
          courses?.map((existing) =>
            existing.id === course.id ? { ...existing, locale } : existing,
          ) ?? null,
      );
    } catch (failure) {
      setSharingError(
        failure instanceof ApiError
          ? failure.message
          : t("contentLanguage.saveError"),
      );
    }
  }

  const visibleCourses =
    data?.filter(
      (course) => language === "all" || course.locale === language,
    ) ?? [];
  const hiddenCount = (data?.length ?? 0) - visibleCourses.length;
  const collectionCourses = visibleCourses.filter(
    (course) =>
      course.course_collection_id !== null &&
      course.course_collection_id !== undefined,
  );
  const ungroupedCourses = visibleCourses.filter(
    (course) =>
      course.course_collection_id === null ||
      course.course_collection_id === undefined,
  );
  const collections = Array.from(
    collectionCourses.reduce((groups, course) => {
      const collectionId = course.course_collection_id!;
      const existing = groups.get(collectionId) ?? {
        id: collectionId,
        title: course.course_collection_title ?? t("courseCollections.title"),
        courses: [],
      };
      existing.courses.push(course);
      groups.set(collectionId, existing);
      return groups;
    }, new Map<string, { id: string; title: string; courses: LearnSubject[] }>()),
  ).map(([, collection]) => collection);

  return (
    <main className="mx-auto max-w-screen-2xl p-4 sm:p-8">
      <PersonalContentTabs />
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("learn.title")}</h1>
        <PersonalContentMenu />
      </header>
      <p className="mt-2 text-gray-700 dark:text-gray-300">
        {t("learn.intro")}
      </p>
      {loading && <p className="mt-6">{t("learn.loading")}</p>}
      {error != null && (
        <p role="alert" className="mt-6 text-red-700 dark:text-red-400">
          {error instanceof ApiError ? error.message : t("learn.loadError")}
        </p>
      )}
      {sharingError && (
        <p role="alert" className="mt-4 text-red-700 dark:text-red-400">
          {sharingError}
        </p>
      )}
      <ContentLanguageSwitcher value={language} onChange={choose} />
      {data && data.length === 0 && <p className="mt-6">{t("learn.empty")}</p>}
      {data && data.length > 0 && hiddenCount > 0 && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t("contentLanguage.hiddenCount", { count: hiddenCount })}
        </p>
      )}
      {data &&
        data.length > 0 &&
        language !== "all" &&
        visibleCourses.length === 0 && (
          <p className="mt-6">
            {t("contentLanguage.emptyCourses", {
              language: contentLanguageLabel(language),
            })}{" "}
            <button
              className="text-indigo-600 underline"
              onClick={() => choose("all")}
            >
              {t("contentLanguage.showAll")}
            </button>
          </p>
        )}
      {collections.length > 0 && (
        <section className="mt-6" aria-labelledby="course-collections-heading">
          <h2
            id="course-collections-heading"
            className="mb-3 text-xl font-semibold"
          >
            {t("courseCollections.title")}
          </h2>
          <ul className="content-card-grid">
            {collections.map((collection) => (
              <li key={collection.id} className="rounded-xl border">
                <Link
                  to={`/learn/collections/${collection.id}`}
                  className="block rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <h3 className="text-lg font-semibold">{collection.title}</h3>
                  <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {t("courseCollections.courseCount", {
                      count: collection.courses.length,
                    })}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {ungroupedCourses.length > 0 && (
        <section className="mt-6" aria-labelledby="ungrouped-courses-heading">
          {collections.length > 0 && (
            <h2
              id="ungrouped-courses-heading"
              className="mb-3 text-xl font-semibold"
            >
              {t("courseCollections.otherCourses")}
            </h2>
          )}
          <ul className="content-card-grid">
            {ungroupedCourses.map((course) => (
              <LearnCourseCard
                key={course.id}
                course={course}
                currentUserId={user?.id}
                sharingId={sharingId}
                onChangeLanguage={(nextCourse, locale) =>
                  void changeLanguage(nextCourse, locale)
                }
                onToggleCommunitySharing={(nextCourse) =>
                  void toggleCommunitySharing(nextCourse)
                }
              />
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
