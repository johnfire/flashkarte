import { useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import type { School } from "../../api/types";

export function SchoolsCard({
  schools,
  onChanged,
}: {
  schools: School[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.admin.createSchool(name.trim());
      setName("");
      onChanged();
    } catch (failure) {
      setError(
        failure instanceof ApiError ? failure.message : t("schools.saveError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{t("schools.schools")}</h3>
      {schools.length === 0 ? (
        <p className="text-sm text-gray-500">{t("schools.noSchools")}</p>
      ) : (
        <ul className="text-sm">
          {schools.map((school) => (
            <li key={school.id} className="flex flex-wrap items-center gap-2">
              <span>
                {school.name} ·{" "}
                {t("schools.memberCount", { count: school.memberCount })}
              </span>
              <Link
                to={`/admin/schools/${school.id}`}
                className="text-indigo-600"
              >
                {t("schools.viewSchool")}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={create} className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("schools.schoolName")}
          aria-label={t("schools.schoolName")}
          className="min-w-0 flex-1 rounded-lg border bg-transparent px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          {t("schools.addSchool")}
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
