import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useDocumentHead } from "../seo/useDocumentHead";
import { LandingHero } from "./landing/LandingHero";
import { LandingFeatures } from "./landing/LandingFeatures";
import { LandingFooter } from "./landing/LandingFooter";

// Decorative cards that drift behind the hero — "learning is happening here".
const FLOATERS = [
  { q: "¿cómo?", a: "how?", pos: "left-[6%] top-[18%]", rot: "-8deg", delay: "0s" },
  { q: "H₂O", a: "water", pos: "right-[8%] top-[14%]", rot: "7deg", delay: "1.2s" },
  { q: "1066", a: "Hastings", pos: "left-[12%] bottom-[16%]", rot: "5deg", delay: "0.6s" },
  { q: "∫x dx", a: "x²/2 + C", pos: "right-[11%] bottom-[20%]", rot: "-6deg", delay: "1.8s" },
  { q: "ありがとう", a: "thank you", pos: "left-[4%] top-[46%]", rot: "6deg", delay: "2.4s" },
  { q: "Au", a: "gold", pos: "right-[5%] top-[44%]", rot: "-7deg", delay: "0.3s" },
  { q: "299,792 km/s", a: "speed of light", pos: "left-[20%] top-[8%]", rot: "-4deg", delay: "1.5s" },
  { q: "πr²", a: "circle area", pos: "right-[22%] top-[6%]", rot: "8deg", delay: "0.9s" },
  { q: "1789", a: "French Rev.", pos: "left-[18%] bottom-[8%]", rot: "-6deg", delay: "2.1s" },
  { q: "Mitochondrion", a: "powerhouse", pos: "right-[18%] bottom-[7%]", rot: "5deg", delay: "1.0s" },
  { q: "Wie geht's?", a: "how are you?", pos: "left-[8%] top-[72%]", rot: "7deg", delay: "0.4s" },
  { q: "E = mc²", a: "mass–energy", pos: "right-[7%] top-[70%]", rot: "-5deg", delay: "1.7s" },
];

export function LandingPage() {
  useDocumentHead({
    title: "flashkarte — Learn anything with spaced-repetition flashcards",
    description:
      "flashkarte is a free spaced-repetition flashcard app. Write decks in plain Markdown or let your own AI build them, and study on web and Android — always in sync.",
  });
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
            style={{ "--fk-rot": f.rot, animationDelay: f.delay } as React.CSSProperties}
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
        <LandingHero />
        <LandingFeatures />
        <LandingFooter />
      </div>
    </div>
  );
}
