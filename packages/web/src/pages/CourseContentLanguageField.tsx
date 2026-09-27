import { api, ApiError } from "../api/client";
import { ContentLanguageField } from "../components/ContentLanguageSwitcher";
import { useTranslation } from "react-i18next";

export function CourseContentLanguageField({
  courseId,
  value,
  onSaved,
}: {
  courseId: string;
  value: string | null | undefined;
  onSaved: (language: string | null | undefined) => void;
}) {
  const { t } = useTranslation();
  async function save(language: "en" | "de" | "ar") {
    try {
      const updated = await api.courses.setContentLanguage(courseId, language);
      onSaved(updated.content_language);
    } catch (failure) {
      window.alert(
        failure instanceof ApiError
          ? failure.message
          : t("contentLanguage.saveError"),
      );
    }
  }

  return (
    <ContentLanguageField
      value={value}
      onChange={(language) => void save(language)}
    />
  );
}
