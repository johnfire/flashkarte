import { useTranslation } from "react-i18next";

// Self-hosted (packages/web/public/video) so the landing page loads no
// third-party player or cookies. preload="none": nothing is downloaded until
// the visitor presses play.
export function LandingVideo({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`mx-auto max-w-3xl ${className}`}>
      <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-indigo-300">
        {t("landing.videoTitle")}
      </h2>
      <video
        className="w-full rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-indigo-950/60"
        controls
        preload="none"
        playsInline
        poster="/video/learnwohl-promo-poster.jpg"
        aria-label={t("landing.videoLabel")}
      >
        <source src="/video/learnwohl-promo.mp4" type="video/mp4" />
        <track
          kind="captions"
          src="/video/learnwohl-promo.en.vtt"
          srcLang="en"
          label="English"
        />
      </video>
    </div>
  );
}
