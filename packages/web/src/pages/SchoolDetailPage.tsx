import { useCallback } from "react";
import { Link, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../api/client";
import type { SchoolDetail } from "../api/types";
import { useAsync } from "../hooks/use-async";
import { SchoolClassesSection } from "./admin/SchoolClassesSection";
import { SchoolMemberList } from "./admin/SchoolMemberList";

function SummaryCount({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <p className="text-2xl font-semibold">{count}</p>
      <p className="text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

export function SchoolDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const loadSchool = useCallback(async () => {
    if (!id) throw new Error("Missing school id");
    const response = await api.admin.getSchool(id);
    return response.school;
  }, [id]);
  const {
    data: schoolDetail,
    error: loadError,
    loading,
  } = useAsync<SchoolDetail, []>(loadSchool, []);
  const error =
    loadError instanceof ApiError
      ? loadError.message
      : loadError
        ? t("schools.loadError")
        : null;

  return (
    <main className="mx-auto max-w-screen-xl p-4 sm:p-8">
      <Link to="/admin" className="text-sm text-indigo-600">
        {t("schools.backToSchools")}
      </Link>
      {loading && !error && (
        <p className="mt-6 text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 text-red-600">
          {error}
        </p>
      )}
      {schoolDetail && (
        <>
          <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("schools.schoolOverview")}
              </p>
              <h1 className="text-3xl font-bold">{schoolDetail.school.name}</h1>
            </div>
            <Link to="/admin" className="rounded-lg border px-3 py-2 text-sm">
              {t("schools.manageSchoolAccounts")}
            </Link>
          </header>
          <section
            aria-label={t("schools.schoolSummary")}
            className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <SummaryCount
              count={schoolDetail.administrators.length}
              label={t("schools.administratorCount", {
                count: schoolDetail.administrators.length,
              })}
            />
            <SummaryCount
              count={schoolDetail.teachers.length}
              label={t("schools.teacherCount", {
                count: schoolDetail.teachers.length,
              })}
            />
            <SummaryCount
              count={schoolDetail.students.length}
              label={t("schools.studentCount", {
                count: schoolDetail.students.length,
              })}
            />
            <SummaryCount
              count={schoolDetail.classes.length}
              label={t("schools.classCount", {
                count: schoolDetail.classes.length,
              })}
            />
          </section>
          <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
            <SchoolMemberList
              sectionId="school-administrators"
              title={t("schools.administrators")}
              members={schoolDetail.administrators}
              emptyMessage={t("schools.noAdministrators")}
              showsVerification={false}
            />
            <SchoolMemberList
              sectionId="school-teachers"
              title={t("schools.teachers")}
              members={schoolDetail.teachers}
              emptyMessage={t("schools.noTeachers")}
              showsVerification
            />
            <SchoolMemberList
              sectionId="school-students"
              title={t("schools.students")}
              members={schoolDetail.students}
              emptyMessage={t("schools.noStudentsAtSchool")}
              showsVerification={false}
            />
            <SchoolClassesSection classes={schoolDetail.classes} />
          </div>
        </>
      )}
    </main>
  );
}
