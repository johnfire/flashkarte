import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { SchoolClass, SchoolClassDetail } from "../../api/types";

export function SchoolClassesSection({ classes }: { classes: SchoolClass[] }) {
  const { t } = useTranslation();
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [classDetails, setClassDetails] = useState<
    Record<string, SchoolClassDetail>
  >({});
  const [error, setError] = useState<string | null>(null);

  async function toggleParticipants(schoolClass: SchoolClass) {
    if (expandedClassId === schoolClass.id) {
      setExpandedClassId(null);
      return;
    }
    setExpandedClassId(schoolClass.id);
    setError(null);
    if (classDetails[schoolClass.id]) return;
    try {
      const response = await api.admin.getClass(schoolClass.id);
      setClassDetails((currentDetails) => ({
        ...currentDetails,
        [schoolClass.id]: response.class,
      }));
    } catch (failure) {
      setExpandedClassId(null);
      setError(
        failure instanceof ApiError ? failure.message : t("schools.loadError"),
      );
    }
  }

  return (
    <section
      aria-labelledby="school-classes-heading"
      className="rounded-lg border p-4"
    >
      <h2 id="school-classes-heading" className="text-xl font-semibold">
        {t("schools.classes")}
      </h2>
      {classes.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t("schools.noClasses")}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {classes.map((schoolClass) => {
            const detail = classDetails[schoolClass.id];
            const isExpanded = expandedClassId === schoolClass.id;
            return (
              <li
                key={schoolClass.id}
                className="rounded-lg border p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{schoolClass.name}</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      {schoolClass.teacherEmail} ·{" "}
                      {t("schools.studentCount", {
                        count: schoolClass.memberCount,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => void toggleParticipants(schoolClass)}
                    className="text-indigo-600"
                  >
                    {isExpanded
                      ? t("schools.hideParticipants")
                      : t("schools.viewParticipants")}
                  </button>
                </div>
                {isExpanded && !detail && (
                  <p className="mt-3 text-gray-500 dark:text-gray-400">
                    {t("common.loading")}
                  </p>
                )}
                {isExpanded && detail && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
                    {detail.members.map((member) => (
                      <li key={member.id}>{member.email}</li>
                    ))}
                    {detail.members.length === 0 && (
                      <li>{t("schools.noClassParticipants")}</li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
