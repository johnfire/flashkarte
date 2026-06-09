import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

const FEATURES = [
  { titleKey: "landing.feature1Title", bodyKey: "landing.feature1Body" },
  { titleKey: "landing.feature2Title", bodyKey: "landing.feature2Body" },
  { titleKey: "landing.feature3Title", bodyKey: "landing.feature3Body" },
  { titleKey: "landing.feature4Title", bodyKey: "landing.feature4Body" },
];

// Decorative cards that drift behind the hero — "learning is happening here".
const FLOATERS = [
  {
    q: "¿cómo?",
    a: "how?",
    pos: "left-[6%] top-[18%]",
    rot: "-8deg",
    delay: "0s",
  },
  {
    q: "H₂O",
    a: "water",
    pos: "right-[8%] top-[14%]",
    rot: "7deg",
    delay: "1.2s",
  },
  {
    q: "1066",
    a: "Hastings",
    pos: "left-[12%] bottom-[16%]",
    rot: "5deg",
    delay: "0.6s",
  },
  {
    q: "∫x dx",
    a: "x²/2 + C",
    pos: "right-[11%] bottom-[20%]",
    rot: "-6deg",
    delay: "1.8s",
  },
  {
    q: "ありがとう",
    a: "thank you",
    pos: "left-[4%] top-[46%]",
    rot: "6deg",
    delay: "2.4s",
  },
  {
    q: "Au",
    a: "gold",
    pos: "right-[5%] top-[44%]",
    rot: "-7deg",
    delay: "0.3s",
  },
  {
    q: "299,792 km/s",
    a: "speed of light",
    pos: "left-[20%] top-[8%]",
    rot: "-4deg",
    delay: "1.5s",
  },
  {
    q: "πr²",
    a: "circle area",
    pos: "right-[22%] top-[6%]",
    rot: "8deg",
    delay: "0.9s",
  },
  {
    q: "1789",
    a: "French Rev.",
    pos: "left-[18%] bottom-[8%]",
    rot: "-6deg",
    delay: "2.1s",
  },
  {
    q: "Mitochondrion",
    a: "powerhouse",
    pos: "right-[18%] bottom-[7%]",
    rot: "5deg",
    delay: "1.0s",
  },
  {
    q: "Wie geht's?",
    a: "how are you?",
    pos: "left-[8%] top-[72%]",
    rot: "7deg",
    delay: "0.4s",
  },
  {
    q: "E = mc²",
    a: "mass–energy",
    pos: "right-[7%] top-[70%]",
    rot: "-5deg",
    delay: "1.7s",
  },
];

export function LandingPage() {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Animated background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Aurora glows */}
        <div className="animate-fk-aurora absolute -left-[10%] -top-[15%] h-[40rem] w-[40rem] rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="animate-fk-aurora-2 absolute -right-[12%] top-[10%] h-[34rem] w-[34rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="animate-fk-aurora absolute bottom-[-15%] left-[25%] h-[36rem] w-[36rem] rounded-full bg-cyan-500/20 blur-3xl" />
        {/* Faint grid */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(148 163 184 / 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.4) 1px, transparent 1px)",
            backgroundSize: "3rem 3rem",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        {/* Floating flashcards */}
        {FLOATERS.map((f) => (
          <div
            key={f.q}
            className={`animate-fk-float absolute hidden rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm md:block ${f.pos}`}
            style={
              {
                "--fk-rot": f.rot,
                animationDelay: f.delay,
              } as React.CSSProperties
            }
          >
            <div className="text-sm font-semibold text-slate-200">{f.q}</div>
            <div className="text-xs text-indigo-300">{f.a}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative mx-auto max-w-5xl px-6 py-20 sm:py-28">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher compact />
        </div>
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-900/50">
            fk
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            {t("landing.heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            {t("landing.heroBody")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login?mode=signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500"
            >
              {t("landing.signupCta")}
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 font-medium text-slate-200 backdrop-blur-sm transition hover:bg-white/10"
            >
              {t("landing.signin")}
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.titleKey}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-indigo-400/30 hover:bg-white/[0.07]"
            >
              <h3 className="text-lg font-semibold text-white">
                {t(f.titleKey)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {t(f.bodyKey)}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-sm text-slate-400">
          <Link
            to="/login?mode=signup"
            className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
          >
            {t("landing.startStudying")}
          </Link>
          <p className="mt-4 space-x-4 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-300">
              {t("common.privacy")}
            </Link>
            <Link to="/impressum" className="hover:text-slate-300">
              {t("common.impressum")}
            </Link>
          </p>
          <p className="mt-4 text-xs text-slate-500">
            {t("landing.productOf")}{" "}
            <a
              href="https://christopherrehm.de"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300"
            >
              Rehm Consulting
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
