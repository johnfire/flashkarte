import { ReactNode } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

export function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg bg-gray-100 p-4 text-xs leading-relaxed text-gray-800 dark:bg-gray-900 dark:text-gray-200">
      <code>{children}</code>
    </pre>
  );
}

export const helpH2 = "text-lg font-semibold text-gray-900 dark:text-gray-100";

interface HelpTopicShellProps {
  title: string;
  children: ReactNode;
  nextTo?: string;
  nextTitle?: string;
}

export function HelpTopicShell({
  title,
  children,
  nextTo,
  nextTitle,
}: HelpTopicShellProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10">
      <div className="mx-auto max-w-2xl rounded-xl bg-white dark:bg-gray-800 px-6 py-8 shadow sm:px-10">
        <Link to="/help" className="text-sm text-indigo-600">
          {t("help.backToIndex")}
        </Link>

        <h1 className="mt-4 text-2xl font-bold">{title}</h1>

        <div className="prose prose-sm mt-6 max-w-none space-y-8 text-gray-700 dark:text-gray-300">
          {children}
        </div>

        {nextTo && nextTitle && (
          <p className="mt-8 border-t pt-6 text-sm">
            <Link to={nextTo} className="text-indigo-600">
              {t("help.next", { title: nextTitle })}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
