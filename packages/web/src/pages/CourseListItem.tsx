import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { CourseSummary } from "../api/types";

interface CourseListItemProps {
  course: CourseSummary;
  onDelete: (id: string, title: string) => void;
}

export function CourseListItem({ course: c, onDelete }: CourseListItemProps) {
  const { t } = useTranslation();
  return (
    <li className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">
          {c.title}
          {c.is_public && (
            <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
              {t("decks.public")}
            </span>
          )}
        </p>
        {c.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {c.description}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("courses.progress", {
            mastered: c.decks_mastered,
            total: c.decks_total,
          })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link to={`/courses/${c.id}`} className="text-sm text-indigo-600">
          {t("courses.open")}
        </Link>
        <button
          onClick={() => onDelete(c.id, c.title)}
          className="text-sm text-red-600"
        >
          {t("decks.delete")}
        </button>
      </div>
    </li>
  );
}
