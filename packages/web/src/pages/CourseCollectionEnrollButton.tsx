import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, reportClientError } from "../api/client";

type CourseSource = "official" | "community";

interface CourseCollectionEnrollButtonProps {
  collectionId: string;
  source: CourseSource;
}

/** Adds every current public course in a collection to the learner's plan. */
export function CourseCollectionEnrollButton({
  collectionId,
  source,
}: CourseCollectionEnrollButtonProps) {
  const { t } = useTranslation();
  const [isAdding, setIsAdding] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addAllCourses() {
    setIsAdding(true);
    setError(null);
    try {
      await api.courseCollections.enrollAll(collectionId, source);
      setIsAdded(true);
    } catch (enrollmentError) {
      reportClientError({
        message:
          enrollmentError instanceof Error
            ? enrollmentError.message
            : String(enrollmentError),
        context: "CourseCollectionEnrollButton.addAllCourses",
      });
      setError(t("courseCatalog.enrollCollectionError"));
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void addAllCourses()}
        disabled={isAdding || isAdded}
        className="rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-60"
      >
        {isAdded
          ? t("courseCatalog.addedAll")
          : isAdding
            ? t("courseCatalog.addingAll")
            : t("courseCatalog.addAll")}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
