import { useTranslation } from "react-i18next";
import type { School } from "../../api/types";

export function SchoolSelect({
  schools,
  value,
  onChange,
  disabled = false,
}: {
  schools: School[];
  value: string | null;
  onChange: (schoolId: string | null) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={t("schools.school")}
      className="w-full rounded-lg border bg-transparent px-3 py-2 disabled:opacity-60"
    >
      <option value="">{t("schools.noSchool")}</option>
      {schools.map((school) => (
        <option key={school.id} value={school.id}>
          {school.name}
        </option>
      ))}
    </select>
  );
}
