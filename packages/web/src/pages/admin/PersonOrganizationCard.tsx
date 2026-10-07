import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { AccountKind } from "../../api/types";
import type { SchoolAdminData } from "./SchoolAdminPanel";
import { SchoolSelect } from "./SchoolSelect";

type Method = "school_roster" | "interview";

/**
 * Set one person's account kind and school, or record that they proved they
 * are a teacher (named on a school's list, or interviewed). Teacher is only
 * offered as a kind once verified; the server enforces the same rule.
 */
export function PersonOrganizationCard({
  data,
  onChanged,
}: {
  data: SchoolAdminData;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const people = data.users.filter((u) => u.role !== "system");
  const [userId, setUserId] = useState("");
  const person = people.find((u) => u.id === userId) ?? null;
  const [kind, setKind] = useState<AccountKind>("individual");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>("interview");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(id: string) {
    const next = people.find((u) => u.id === id);
    setUserId(id);
    setKind(next?.accountKind ?? "individual");
    setSchoolId(next?.schoolId ?? null);
    setMessage(null);
    setError(null);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(t("schools.saved"));
      onChanged();
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("schools.saveError"),
      );
    } finally {
      setBusy(false);
    }
  }

  const kinds: AccountKind[] = person?.teacherVerified
    ? ["individual", "school", "teacher", "student"]
    : ["individual", "school", "student"];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{t("schools.people")}</h3>
      <select
        value={userId}
        onChange={(e) => choose(e.target.value)}
        aria-label={t("schools.person")}
        className="w-full rounded-lg border bg-transparent px-3 py-2"
      >
        <option value="">{t("schools.choosePerson")}</option>
        {people.map((u) => (
          <option key={u.id} value={u.id}>
            {u.email} · {t(`schools.kind_${u.accountKind ?? "individual"}`)}
          </option>
        ))}
      </select>

      {person && (
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2 rounded-lg border p-3 text-sm">
            <legend className="px-1 font-medium">
              {t("schools.kindAndSchool")}
            </legend>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as AccountKind)}
              aria-label={t("schools.kind")}
              className="w-full rounded-lg border bg-transparent px-3 py-2"
            >
              {kinds.map((k) => (
                <option key={k} value={k}>
                  {t(`schools.kind_${k}`)}
                </option>
              ))}
            </select>
            <SchoolSelect
              schools={data.schools}
              value={kind === "individual" ? null : schoolId}
              disabled={kind === "individual"}
              onChange={setSchoolId}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  api.admin.setOrganization(
                    person.id,
                    kind,
                    kind === "individual" ? null : schoolId,
                  ),
                )
              }
              className="rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-60"
            >
              {t("common.save")}
            </button>
          </fieldset>

          <fieldset className="space-y-2 rounded-lg border p-3 text-sm">
            <legend className="px-1 font-medium">
              {t("schools.verifyTeacher")}
            </legend>
            {person.teacherVerified && (
              <p className="text-green-700 dark:text-green-400">
                {t("schools.alreadyVerified")}
              </p>
            )}
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as Method)}
              aria-label={t("schools.method")}
              className="w-full rounded-lg border bg-transparent px-3 py-2"
            >
              <option value="interview">{t("schools.method_interview")}</option>
              <option value="school_roster">
                {t("schools.method_school_roster")}
              </option>
            </select>
            <SchoolSelect
              schools={data.schools}
              value={schoolId}
              onChange={setSchoolId}
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("schools.note")}
              aria-label={t("schools.note")}
              className="w-full rounded-lg border bg-transparent px-3 py-2"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  api.admin.verifyTeacher(person.id, method, schoolId, note),
                )
              }
              className="rounded-lg bg-indigo-600 px-3 py-2 text-white disabled:opacity-60"
            >
              {t("schools.verify")}
            </button>
          </fieldset>
        </div>
      )}
      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
