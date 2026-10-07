import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { AdminUser, SchoolClass } from "../../api/types";

/**
 * Tick the students in one class. Only student accounts are offered, and for
 * a school's class only that school's students; the server rejects the whole
 * list if any one does not fit, so a class is never left half-updated.
 */
export function ClassMembersEditor({
  schoolClass,
  users,
  onClose,
  onSaved,
}: {
  schoolClass: SchoolClass;
  users: AdminUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eligible = users.filter(
    (u) =>
      u.accountKind === "student" &&
      (!schoolClass.schoolId || u.schoolId === schoolClass.schoolId),
  );

  useEffect(() => {
    let active = true;
    api.admin
      .getClass(schoolClass.id)
      .then(({ class: detail }) => {
        if (active) setSelected(new Set(detail.members.map((m) => m.id)));
      })
      .catch(() => {
        if (active) setError(t("schools.loadError"));
      });
    return () => {
      active = false;
    };
  }, [schoolClass.id, t]);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current ?? []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.admin.setClassMembers(schoolClass.id, [...selected]);
      onSaved();
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("schools.saveError"),
      );
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border p-3 text-sm">
      <p className="font-medium">
        {t("schools.studentsIn", { name: schoolClass.name })}
      </p>
      {!selected && !error && <p>{t("common.loading")}</p>}
      {selected && eligible.length === 0 && <p>{t("schools.noStudents")}</p>}
      {selected &&
        eligible.map((student) => (
          <label key={student.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.has(student.id)}
              onChange={() => toggle(student.id)}
            />
            {student.email}
          </label>
        ))}
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy || !selected}
          onClick={() => void save()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-60"
        >
          {t("common.save")}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-3 py-2"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
