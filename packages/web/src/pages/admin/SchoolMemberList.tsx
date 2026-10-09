import { useTranslation } from "react-i18next";
import type { SchoolMember } from "../../api/types";

interface SchoolMemberListProps {
  members: SchoolMember[];
  sectionId: string;
  title: string;
  emptyMessage: string;
  showsVerification: boolean;
}

export function SchoolMemberList({
  members,
  sectionId,
  title,
  emptyMessage,
  showsVerification,
}: SchoolMemberListProps) {
  const { t } = useTranslation();

  return (
    <section
      aria-labelledby={`${sectionId}-heading`}
      className="rounded-lg border p-4"
    >
      <h2 id={`${sectionId}-heading`} className="text-xl font-semibold">
        {title}
      </h2>
      {members.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {members.map((member) => (
            <li key={member.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{member.email}</p>
              {showsVerification && (
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {member.teacherVerified
                    ? t("schools.verifiedTeacher")
                    : t("schools.unverifiedTeacher")}
                </p>
              )}
              {member.classes.length > 0 && (
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {t("schools.memberClasses", {
                    count: member.classes.length,
                    names: member.classes
                      .map((schoolClass) => schoolClass.name)
                      .join(", "),
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
