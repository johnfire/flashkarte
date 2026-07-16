import { useTranslation } from "react-i18next";

const FEATURES = [
  { titleKey: "landing.feature1Title", bodyKey: "landing.feature1Body" },
  { titleKey: "landing.feature2Title", bodyKey: "landing.feature2Body" },
  { titleKey: "landing.feature3Title", bodyKey: "landing.feature3Body" },
  { titleKey: "landing.feature4Title", bodyKey: "landing.feature4Body" },
];

export function LandingFeatures() {
  const { t } = useTranslation();
  return (
    <div className="mt-20 grid gap-6 sm:grid-cols-2">
      {FEATURES.map((f) => (
        <div
          key={f.titleKey}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-indigo-400/30 hover:bg-white/[0.07]"
        >
          <h3 className="text-lg font-semibold text-white">{t(f.titleKey)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {t(f.bodyKey)}
          </p>
        </div>
      ))}
    </div>
  );
}
