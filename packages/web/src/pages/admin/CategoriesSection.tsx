import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client";
import { useAsync } from "../../hooks/use-async";
import { CategoriesPanel } from "./CategoriesPanel";
import { CategoryAssignPanel } from "./CategoryAssignPanel";

/** Category management + assignment, as one admin-page section. Owns the shared tree fetch both panels need. */
export function CategoriesSection() {
  const { t } = useTranslation();
  const loadTree = useCallback(() => api.admin.categoryTree(), []);
  const { data, error, loading, reload } = useAsync(loadTree, []);

  const errorMessage =
    error instanceof ApiError
      ? error.message
      : error
        ? t("admin.categories.loadError")
        : null;

  return (
    <section className="mb-8 rounded-lg border p-4">
      {loading && (
        <p className="text-gray-500 dark:text-gray-400">
          {t("common.loading")}
        </p>
      )}
      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}
      {data && (
        <div className="space-y-6">
          <CategoriesPanel
            categories={data.categories}
            onChanged={() => void reload()}
          />
          <CategoryAssignPanel categories={data.categories} />
        </div>
      )}
    </section>
  );
}
