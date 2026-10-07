import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { SchoolClass } from "../../api/types";
import type { SchoolAdminData } from "./SchoolAdminPanel";
import { ClassMembersEditor } from "./ClassMembersEditor";

export function ClassesCard({
  data,
  onChanged,
}: {
  data: SchoolAdminData;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const teachers = data.users.filter((u) => u.accountKind === "teacher");
  const [teacherId, setTeacherId] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("schools.saveError"),
      );
    } finally {
      setBusy(false);
    }
  }

  function remove(schoolClass: SchoolClass) {
    if (
      !window.confirm(
        t("schools.deleteClassConfirm", { name: schoolClass.name }),
      )
    )
      return;
    void run(() => api.admin.deleteClass(schoolClass.id));
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t("schools.classes")}</h3>
      {data.classes.length === 0 && (
        <p className="text-sm text-gray-500">{t("schools.noClasses")}</p>
      )}
      <ul className="space-y-1 text-sm">
        {data.classes.map((schoolClass) => (
          <li
            key={schoolClass.id}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <span>
              {schoolClass.name} · {schoolClass.teacherEmail} ·{" "}
              {schoolClass.schoolName ?? t("schools.independent")} ·{" "}
              {t("schools.studentCount", { count: schoolClass.memberCount })}
            </span>
            <span className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditing(schoolClass)}
                className="text-indigo-600"
              >
                {t("schools.editStudents")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(schoolClass)}
                className="text-red-600"
              >
                {t("schools.deleteClass")}
              </button>
            </span>
          </li>
        ))}
      </ul>

      {editing && (
        <ClassMembersEditor
          schoolClass={editing}
          users={data.users}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await api.admin.createClass(teacherId, name.trim());
            setName("");
          });
        }}
        className="flex flex-wrap gap-2"
      >
        <select
          value={teacherId}
          onChange={(e) => setTeacherId(e.target.value)}
          aria-label={t("schools.teacher")}
          className="rounded-lg border bg-transparent px-3 py-2"
        >
          <option value="">{t("schools.chooseTeacher")}</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.email}
            </option>
          ))}
        </select>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("schools.className")}
          aria-label={t("schools.className")}
          className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy || !teacherId || !name.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {t("schools.addClass")}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
