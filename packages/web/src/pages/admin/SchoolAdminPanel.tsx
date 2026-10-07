import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import type { AdminUser, School, SchoolClass } from "../../api/types";
import { useAsync } from "../../hooks/use-async";
import { SchoolsCard } from "./SchoolsCard";
import { PersonOrganizationCard } from "./PersonOrganizationCard";
import { ClassesCard } from "./ClassesCard";

export interface SchoolAdminData {
  users: AdminUser[];
  schools: School[];
  classes: SchoolClass[];
}

/**
 * Schools, teachers, students and classes. The admin enters everything a
 * school or teacher sends in (see the accounts design doc); each card reloads
 * the shared data after a change so the others never show stale people.
 */
export function SchoolAdminPanel() {
  const { t } = useTranslation();
  const load = useCallback(async (): Promise<SchoolAdminData> => {
    const [users, schools, classes] = await Promise.all([
      api.admin.listUsers(),
      api.admin.listSchools(),
      api.admin.listClasses(),
    ]);
    return {
      users: users.users,
      schools: schools.schools,
      classes: classes.classes,
    };
  }, []);
  const { data, error, reload } = useAsync<SchoolAdminData, []>(load, []);
  const refresh = () => void reload();

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h2 className="text-xl font-semibold">{t("schools.title")}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {t("schools.hint")}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {t("schools.loadError")}
        </p>
      ) : null}
      {!data && !error && (
        <p className="text-sm text-gray-500">{t("common.loading")}</p>
      )}
      {data && (
        <>
          <SchoolsCard schools={data.schools} onChanged={refresh} />
          <PersonOrganizationCard data={data} onChanged={refresh} />
          <ClassesCard data={data} onChanged={refresh} />
        </>
      )}
    </section>
  );
}
