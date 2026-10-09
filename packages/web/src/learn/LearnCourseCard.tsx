import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { LearnSubject } from "../api/learn-types";
import {
  ContentLanguageField,
  contentLanguageLabel,
} from "../components/ContentLanguageSwitcher";
import { api } from "../api/client";
import { GroupShareButton } from "../components/GroupShareButton";

export function courseProgressCardClass(
  progress?: LearnSubject["course_progress"],
) {
  if (progress === "completed")
    return "border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/40";
  if (progress === "in_progress")
    return "border-sky-400 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40";
  return "border";
}

export function CourseProgressBadge({
  progress,
}: {
  progress?: LearnSubject["course_progress"];
}) {
  const { t } = useTranslation();
  if (progress === "completed")
    return (
      <span className="ml-2 rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
        {t("learn.courseCompleted")}
      </span>
    );
  if (progress === "in_progress")
    return (
      <span className="ml-2 rounded-full bg-sky-200 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900 dark:text-sky-200">
        {t("learn.state.in_progress")}
      </span>
    );
  return null;
}

interface LearnCourseCardProps {
  course: LearnSubject;
  currentUserId?: string;
  sharingId: string | null;
  onChangeLanguage: (course: LearnSubject, locale: "en" | "de" | "ar") => void;
  onToggleCommunitySharing: (course: LearnSubject) => void;
}

/** A course card used for ungrouped personal courses and collection contents. */
export function LearnCourseCard({
  course,
  currentUserId,
  sharingId,
  onChangeLanguage,
  onToggleCommunitySharing,
}: LearnCourseCardProps) {
  const { t } = useTranslation();
  const isOwnedCommunityCourse =
    course.user_id === currentUserId && !course.is_official;
  return (
    <li
      className={`rounded-xl ${courseProgressCardClass(course.course_progress)}`}
    >
      <Link
        to={`/learn/${course.id}`}
        className="block rounded-xl p-4 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="block text-lg font-semibold">
          {course.title}
          {contentLanguageLabel(course.locale) && (
            <span className="ml-2 text-xs font-normal">
              {contentLanguageLabel(course.locale)}
            </span>
          )}
          {course.reference_number !== undefined && (
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              #{course.reference_number}
            </span>
          )}
          {course.is_official && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              {t("learn.official")}
            </span>
          )}
          {course.is_public && !course.is_official && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              {t("learn.community")}
            </span>
          )}
          <CourseProgressBadge progress={course.course_progress} />
        </span>
        {course.description && (
          <span className="block text-sm text-gray-700 dark:text-gray-300">
            {course.description}
          </span>
        )}
        <span className="block text-xs text-gray-600 dark:text-gray-400">
          {t("learn.conceptCount", { count: course.concept_count })}
        </span>
      </Link>
      {isOwnedCommunityCourse && (
        <div className="px-4 pb-4">
          <ContentLanguageField
            value={course.locale}
            onChange={(locale) => onChangeLanguage(course, locale)}
          />
          <GroupShareButton
            itemTitle={course.title}
            load={() => api.learn.getShares(course.id)}
            save={(shares) => api.learn.setShares(course.id, shares)}
          />
          <button
            onClick={() => onToggleCommunitySharing(course)}
            disabled={sharingId === course.id}
            className="text-sm text-indigo-600 disabled:opacity-60"
          >
            {sharingId === course.id
              ? t("learn.sharing")
              : course.is_public
                ? t("learn.unshare")
                : t("learn.share")}
          </button>
        </div>
      )}
    </li>
  );
}
