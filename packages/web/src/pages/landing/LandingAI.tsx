import { useTranslation } from "react-i18next";

const POINTS = [
  { titleKey: "landing.aiPoint1Title", bodyKey: "landing.aiPoint1Body" },
  { titleKey: "landing.aiPoint2Title", bodyKey: "landing.aiPoint2Body" },
  { titleKey: "landing.aiPoint3Title", bodyKey: "landing.aiPoint3Body" },
];

export function LandingAI() {
  const { t } = useTranslation();
  return (
    <div className="mt-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          {t("landing.aiSectionTitle")}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-slate-300">
          {t("landing.aiSectionBody")}
        </p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {POINTS.map((p) => (
          <div
            key={p.titleKey}
            className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.06] p-6 backdrop-blur-sm transition hover:border-indigo-400/40 hover:bg-indigo-500/[0.1]"
          >
            <h3 className="text-base font-semibold text-white">
              {t(p.titleKey)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {t(p.bodyKey)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
