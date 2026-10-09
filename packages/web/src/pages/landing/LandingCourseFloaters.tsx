const COURSE_FLOATERS = [
  {
    course: "French A1",
    lesson: "Lesson 3 · Asking directions",
    progress: "2 of 8 complete",
    pos: "left-[2%] top-[29%]",
    rot: "4deg",
    delay: "0.8s",
  },
  {
    course: "Algebra essentials",
    lesson: "Try: Solve 3x + 5 = 20",
    progress: "Your turn",
    pos: "right-[1%] top-[30%]",
    rot: "-4deg",
    delay: "2.7s",
  },
  {
    course: "German at the café",
    lesson: "Can you order a drink?",
    progress: "Practice question",
    pos: "left-[-4%] top-[18%]",
    rot: "-6deg",
    delay: "1.1s",
  },
  {
    course: "Circuit analysis",
    lesson: "Lesson 2 · Ohm's law",
    progress: "4 of 7 complete",
    pos: "right-[-4%] top-[26%]",
    rot: "6deg",
    delay: "2.1s",
  },
  {
    course: "History of Rome",
    lesson: "Why did the Republic end?",
    progress: "Quick check",
    pos: "left-[3%] top-[58%]",
    rot: "-3deg",
    delay: "1.9s",
  },
  {
    course: "Workplace safety",
    lesson: "What do you do first?",
    progress: "Knowledge check",
    pos: "right-[2%] top-[59%]",
    rot: "3deg",
    delay: "0.5s",
  },
];

export function LandingCourseFloaters() {
  return COURSE_FLOATERS.map((courseFloater) => (
    <div
      key={courseFloater.course}
      className={`animate-fk-float absolute hidden w-48 rounded-xl border border-indigo-300/20 bg-slate-900/70 p-3 shadow-lg shadow-indigo-950/20 backdrop-blur-sm lg:block ${courseFloater.pos}`}
      style={
        {
          "--fk-rot": courseFloater.rot,
          animationDelay: courseFloater.delay,
        } as React.CSSProperties
      }
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-indigo-300">
        {courseFloater.course}
      </p>
      <p className="mt-2 text-sm font-medium leading-snug text-slate-100">
        {courseFloater.lesson}
      </p>
      <p className="mt-3 text-xs text-slate-400">{courseFloater.progress}</p>
    </div>
  ));
}
