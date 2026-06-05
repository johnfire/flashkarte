import { Link } from "react-router-dom";

const FEATURES = [
  {
    title: "Markdown decks",
    body: "Write cards in plain Markdown — paste, import a file, or generate them. No clunky editors.",
  },
  {
    title: "Spaced repetition",
    body: "A proven SM-2 schedule shows you each card right before you'd forget it, so reviews stay short.",
  },
  {
    title: "Study anywhere",
    body: "Web and Android, in sync. Pick up your reviews on the bus and finish them at your desk.",
  },
  {
    title: "Bring your own AI",
    body: "Connect your own AI assistant over MCP to turn notes into decks — no extra subscription.",
  },
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
];

export function LandingPage() {
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
        {/* Hero */}
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl font-bold text-white shadow-lg shadow-indigo-900/50">
            fk
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Learn anything, faster.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-300">
            flashkarte is a spaced-repetition flashcard app. Write your cards in
            plain Markdown — or let your own AI build them — and it schedules
            each review for the moment right before you'd forget. Study on the
            web or on Android, always in sync.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login?mode=signup"
              className="rounded-lg bg-indigo-600 px-6 py-3 font-medium text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500"
            >
              Sign up — it's free
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-white/15 bg-white/5 px-6 py-3 font-medium text-slate-200 backdrop-blur-sm transition hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-indigo-400/30 hover:bg-white/[0.07]"
            >
              <h3 className="text-lg font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {f.body}
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
            Start studying →
          </Link>
          <p className="mt-4 space-x-4 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-slate-300">
              Privacy Policy
            </Link>
            <Link to="/impressum" className="hover:text-slate-300">
              Impressum
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
