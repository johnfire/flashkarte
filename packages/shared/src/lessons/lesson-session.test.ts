import {
  answerQuestion,
  comeBackLater,
  continueRemediation,
  describeStep,
  HELP_AFTER_MISSES,
  lessonResult,
  nextScreen,
  previousScreen,
  reconcile,
  resume,
  SessionError,
  startSession,
  type LessonSession,
  type QuestionContent,
  type SessionContent,
} from "./lesson-session";
import { seededRandom } from "./seeded-random";

const rand = () => seededRandom(7);
/** presentations: option counts, first is the question itself; the correct option is index 0 of each. */
const question = (
  id: string,
  screens: string[],
  presentations: number[] = [4],
): QuestionContent => ({
  id,
  screens,
  presentations: presentations.map((optionCount, i) => ({
    id: i === 0 ? id : `${id}-v${i}`,
    optionCount,
    correctIndex: 0,
  })),
});
const content = (over: Partial<SessionContent> = {}): SessionContent => ({
  screens: ["1", "2", "3"],
  questions: [question("q1", ["1"]), question("q2", ["2", "3"])],
  ...over,
});

/** The shown position of the correct / a wrong option for the question currently on screen. */
const positionOf = (
  session: LessonSession,
  wantCorrect: boolean,
  sc: SessionContent,
): number => {
  const presented = session.presented!;
  const question = sc.questions.find((q) => q.id === presented.questionId)!;
  const presentation = question.presentations.find(
    (p) => p.id === presented.presentationId,
  )!;
  return presented.optionOrder.findIndex(
    (original) => (original === presentation.correctIndex) === wantCorrect,
  );
};
const right = (s: LessonSession, sc: SessionContent, r = rand()) =>
  answerQuestion(s, sc, positionOf(s, true, sc), r);
const wrong = (s: LessonSession, sc: SessionContent, r = rand()) =>
  answerQuestion(s, sc, positionOf(s, false, sc), r);
const toQuestions = (sc: SessionContent, r = rand()) => {
  let s = startSession(sc, r);
  for (let i = 0; i < sc.screens.length; i++) s = nextScreen(s, sc, r);
  return s;
};

describe("starting a session", () => {
  it("refuses a lesson with no questions", () => {
    expect(() => startSession(content({ questions: [] }), rand())).toThrow(
      SessionError,
    );
    expect(() => startSession(content({ questions: [] }), rand())).toThrow(
      /no questions/,
    );
  });

  it("starts on the first screen, with every question waiting", () => {
    const s = startSession(content(), rand());
    expect(s).toMatchObject({
      phase: "screens",
      currentScreen: "1",
      queue: ["q1", "q2"],
      paused: false,
    });
    expect(Object.keys(s.runs)).toEqual(["q1", "q2"]);
  });

  it("can skip the screens (a review or test-out) and ask only chosen questions", () => {
    const s = startSession(content(), rand(), {
      skipScreens: true,
      only: ["q2"],
    });
    expect(s.phase).toBe("questions");
    expect(s.queue).toEqual(["q2"]);
    expect(s.presented?.questionId).toBe("q2");
  });

  it("goes straight to the questions when a lesson has no screens", () => {
    expect(startSession(content({ screens: [] }), rand()).phase).toBe(
      "questions",
    );
  });
});

describe("the screens", () => {
  it("moves through the screens in order, recording each as read, then into the questions", () => {
    const sc = content();
    let s = startSession(sc, rand());
    s = nextScreen(s, sc, rand());
    expect(s.currentScreen).toBe("2");
    s = nextScreen(nextScreen(s, sc, rand()), sc, rand());
    expect(s.phase).toBe("questions");
    expect(s.readScreens).toEqual(["1", "2", "3"]);
    expect(s.currentScreen).toBeNull();
  });

  it("goes back, but never before the first screen", () => {
    const sc = content();
    let s = nextScreen(startSession(sc, rand()), sc, rand());
    s = previousScreen(s, sc);
    expect(s.currentScreen).toBe("1");
    expect(previousScreen(s, sc).currentScreen).toBe("1");
  });

  it("follows decimal screen numbers (an inserted clarifying screen appears in place)", () => {
    const sc = content({ screens: ["1", "1.010", "2"] });
    let s = startSession(sc, rand());
    s = nextScreen(s, sc, rand());
    expect(s.currentScreen).toBe("1.010");
  });

  it("refuses actions from the wrong phase", () => {
    const sc = content();
    const questions = toQuestions(sc);
    expect(() => nextScreen(questions, sc, rand())).toThrow(/questions/);
    expect(() =>
      answerQuestion(startSession(sc, rand()), sc, 0, rand()),
    ).toThrow(SessionError);
  });
});

describe("answering", () => {
  it("shows every option exactly once, shuffled", () => {
    const sc = content({ questions: [question("q1", ["1"], [6])] });
    const s = toQuestions(sc);
    expect([...s.presented!.optionOrder].sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("a right answer moves on to the next question, and the last one passes the lesson", () => {
    const sc = content();
    const s = toQuestions(sc);
    const first = right(s, sc);
    expect(first.outcome).toMatchObject({ correct: true, misses: 0 });
    expect(first.session.presented?.questionId).toBe("q2");
    const second = right(first.session, sc);
    expect(second.session.phase).toBe("passed");
    expect(lessonResult(second.session)).toMatchObject({
      total: 2,
      firstTryRight: 2,
    });
  });

  it("rejects a choice that is not one of the options", () => {
    const sc = content();
    const s = toQuestions(sc);
    expect(() => answerQuestion(s, sc, 99, rand())).toThrow(/does not exist/);
    expect(() => answerQuestion(s, sc, -1, rand())).toThrow(SessionError);
  });

  it("reveals the correct option only in the outcome, never in the step", () => {
    const sc = content();
    const s = toQuestions(sc);
    const step = JSON.stringify(describeStep(s, sc));
    expect(step).not.toMatch(/correct/i);
    expect(right(s, sc).outcome.correctOptionIndex).toBe(0);
  });
});

describe("a wrong answer", () => {
  it("shows the teaching screens in order, then asks again", () => {
    const sc = content({ questions: [question("q1", ["2", "3"], [4, 4])] });
    let s = toQuestions(sc);
    s = wrong(s, sc).session;
    expect(describeStep(s, sc)).toMatchObject({
      kind: "remediation",
      number: "2",
      position: 0,
      of: 2,
    });
    s = continueRemediation(s, sc, rand());
    expect(describeStep(s, sc)).toMatchObject({
      kind: "remediation",
      number: "3",
      position: 1,
    });
    s = continueRemediation(s, sc, rand());
    expect(s.phase).toBe("questions");
  });

  it("re-asks with a different variant when the question has one", () => {
    const sc = content({ questions: [question("q1", ["1"], [4, 4])] });
    let s = toQuestions(sc, seededRandom(1));
    const firstAsked = s.presented!.presentationId;
    s = continueRemediation(wrong(s, sc).session, sc, seededRandom(2));
    expect(s.presented!.presentationId).not.toBe(firstAsked);
  });

  it("with no variant, sends the question to the back of the set and asks the others first", () => {
    const sc = content({
      questions: [question("q1", ["1"]), question("q2", ["2"])],
    });
    let s = toQuestions(sc);
    s = continueRemediation(wrong(s, sc).session, sc, rand());
    expect(s.presented?.questionId).toBe("q2");
    expect(s.queue).toEqual(["q2", "q1"]);
  });

  it("with no variant and nothing else left, re-asks the same question with the options in a different order", () => {
    const sc = content({ questions: [question("q1", ["1"], [5])] });
    let s = toQuestions(sc);
    const before = s.presented!.optionOrder;
    s = continueRemediation(wrong(s, sc).session, sc, rand());
    expect(s.presented!.questionId).toBe("q1");
    expect(s.presented!.optionOrder).not.toEqual(before);
  });

  it("counts misses, offers help from the second miss, and remembers the first attempt was wrong", () => {
    const sc = content({ questions: [question("q1", ["1"], [4, 4])] });
    let s = toQuestions(sc);
    const first = wrong(s, sc);
    expect(first.outcome).toMatchObject({ misses: 1, helpOffered: false });
    s = continueRemediation(first.session, sc, rand());
    const second = wrong(s, sc);
    expect(second.outcome).toMatchObject({
      misses: HELP_AFTER_MISSES,
      helpOffered: true,
    });
    expect(describeStep(second.session, sc)).toMatchObject({
      kind: "remediation",
      helpOffered: true,
    });
    const s3 = continueRemediation(second.session, sc, rand());
    expect(describeStep(s3, sc)).toMatchObject({
      kind: "question",
      misses: 2,
      helpOffered: true,
    });
    const done = right(s3, sc).session;
    expect(lessonResult(done).byQuestion[0]).toEqual({
      questionId: "q1",
      firstTry: "wrong",
      misses: 2,
    });
    expect(lessonResult(done).firstTryRight).toBe(0);
  });

  it("does not offer help on the first miss, and clears the offer once the question is right", () => {
    const sc = content({
      questions: [question("q1", ["1"], [4, 4]), question("q2", ["2"])],
    });
    let s = toQuestions(sc);
    s = continueRemediation(wrong(s, sc).session, sc, rand());
    s = continueRemediation(wrong(s, sc).session, sc, rand());
    expect(s.helpOffered).toBe("q1");
    s = right(s, sc).session;
    expect(s.helpOffered).toBeNull();
  });

  it("skips straight back to the question if a question somehow names no screens", () => {
    const sc = content({ questions: [question("q1", [], [4, 4])] });
    const s = wrong(toQuestions(sc), sc).session;
    expect(s.phase).toBe("questions");
  });
});

describe("coming back later", () => {
  it("keeps everything, blocks further answers, and is undone by resuming", () => {
    const sc = content();
    const s = wrong(toQuestions(sc), sc).session;
    const paused = comeBackLater(s);
    expect(paused.paused).toBe(true);
    expect(paused.phase).toBe("remediation");
    expect(describeStep(paused, sc)).toEqual({ kind: "paused" });
    expect(() => continueRemediation(paused, sc, rand())).toThrow(/paused/);
    const back = resume(paused);
    expect(describeStep(back, sc).kind).toBe("remediation");
    expect(back.runs).toEqual(paused.runs);
  });

  it("cannot pause a lesson that is already passed", () => {
    const sc = content({ questions: [question("q1", ["1"])] });
    const passedSession = right(toQuestions(sc), sc).session;
    expect(() => comeBackLater(passedSession)).toThrow(/already passed/);
  });
});

describe("step descriptions", () => {
  it("counts progress on the screens and the questions", () => {
    const sc = content();
    expect(describeStep(startSession(sc, rand()), sc)).toEqual({
      kind: "screen",
      number: "1",
      index: 0,
      total: 3,
      canGoBack: false,
    });
    const s = toQuestions(sc);
    expect(describeStep(s, sc)).toMatchObject({
      kind: "question",
      answered: 0,
      total: 2,
    });
    expect(describeStep(right(s, sc).session, sc)).toMatchObject({
      kind: "question",
      answered: 1,
      total: 2,
    });
  });
});

describe("reconciling a saved session with edited content", () => {
  it("moves on when the current screen is gone, and to the questions when none is left", () => {
    const sc = content();
    const s = nextScreen(startSession(sc, rand()), sc, rand());
    expect(
      reconcile(s, content({ screens: ["1", "3"] }), rand()).currentScreen,
    ).toBe("3");
    expect(reconcile(s, content({ screens: ["1"] }), rand()).phase).toBe(
      "questions",
    );
  });

  it("drops a removed question and appends a new one, leaving answered ones alone", () => {
    const sc = content();
    const s = right(toQuestions(sc), sc).session;
    const edited = content({
      questions: [question("q1", ["1"]), question("q3", ["1"])],
    });
    const r = reconcile(s, edited, rand());
    expect(r.queue).toEqual(["q3"]);
    expect(r.runs.q1.correct).toBe(true);
    expect(r.runs.q2).toBeUndefined();
    expect(r.presented?.questionId).toBe("q3");
  });

  it("leaves a passed lesson passed when a question is added (only new learners are affected)", () => {
    const sc = content({ questions: [question("q1", ["1"])] });
    const done = right(toQuestions(sc), sc).session;
    const edited = content({
      questions: [question("q1", ["1"]), question("q2", ["2"])],
    });
    expect(reconcile(done, edited, rand())).toBe(done);
  });

  it("re-asks when the question on screen has been retired, and drops teaching screens that are gone", () => {
    const sc = content();
    const s = wrong(toQuestions(sc), sc).session; // q1 taught by "1"
    const noScreen = content({
      screens: ["2", "3"],
      questions: [question("q1", ["1", "2"]), question("q2", ["2", "3"])],
    });
    const r = reconcile(s, noScreen, rand());
    expect(r.remediation?.screens).toEqual(["2"]);
    const retired = content({ questions: [question("q2", ["2", "3"])] });
    expect(reconcile(s, retired, rand()).presented?.questionId).toBe("q2");
  });

  it("passes a session whose remaining questions were all removed", () => {
    const sc = content();
    const s = toQuestions(sc);
    expect(reconcile(s, content({ questions: [] }), rand()).phase).toBe(
      "passed",
    );
  });
});

describe("simulated learners", () => {
  function randomContent(random: () => number): SessionContent {
    const screens = Array.from(
      { length: 1 + Math.floor(random() * 6) },
      (_, i) => String(i + 1),
    );
    const count = 1 + Math.floor(random() * 5);
    return {
      screens,
      questions: Array.from({ length: count }, (_, q) =>
        question(
          `q${q}`,
          screens.slice(
            0,
            1 + Math.floor(random() * Math.min(3, screens.length)),
          ),
          Array.from(
            { length: 1 + Math.floor(random() * 3) },
            () => 2 + Math.floor(random() * 4),
          ),
        ),
      ),
    };
  }

  function checkInvariants(s: LessonSession, sc: SessionContent): void {
    for (const id of s.queue) expect(s.runs[id].correct).toBe(false);
    if (s.phase === "questions") {
      expect(s.presented!.questionId).toBe(s.queue[0]);
      const order = s.presented!.optionOrder;
      expect([...order].sort((a, b) => a - b)).toEqual(order.map((_, i) => i));
    }
    if (s.phase === "remediation")
      expect(s.runs[s.remediation!.questionId].misses).toBeGreaterThan(0);
    if (s.phase === "passed")
      expect(Object.values(s.runs).every((r) => r.correct && r.firstTry)).toBe(
        true,
      );
    JSON.stringify(describeStep(s, sc)); // never throws
  }

  /** Reads every screen, then answers each question right with probability p until passed. */
  function play(seed: number, accuracy: number, maxSteps = 2000) {
    const random = seededRandom(seed);
    const sc = randomContent(random);
    let s = startSession(sc, random);
    let steps = 0;
    let maxMisses = 0;
    while (s.phase !== "passed" && steps++ < maxSteps) {
      checkInvariants(s, sc);
      if (s.phase === "screens") s = nextScreen(s, sc, random);
      else if (s.phase === "remediation")
        s = continueRemediation(s, sc, random);
      else {
        const ok = random() < accuracy;
        s = answerQuestion(s, sc, positionOf(s, ok, sc), random).session;
        maxMisses = Math.max(
          maxMisses,
          ...Object.values(s.runs).map((r) => r.misses),
        );
      }
    }
    return { s, sc, steps, maxMisses };
  }

  it.each([0.3, 0.6, 0.9, 1])(
    "a learner who answers right %s of the time always finishes, and every question was answered right",
    (accuracy) => {
      for (let seed = 1; seed <= 150; seed++) {
        const { s, steps } = play(seed, accuracy);
        expect(s.phase).toBe("passed");
        expect(steps).toBeLessThan(2000);
        expect(lessonResult(s).total).toBe(Object.keys(s.runs).length);
      }
    },
  );

  it("a learner who is always right scores 100% on the first try and is never offered help", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { s, maxMisses } = play(seed, 1);
      expect(lessonResult(s).firstTryRight).toBe(lessonResult(s).total);
      expect(maxMisses).toBe(0);
    }
  });

  it("a learner who is always wrong never passes, never crashes, and is offered help", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const { s, maxMisses } = play(seed, 0, 300);
      expect(s.phase).not.toBe("passed");
      expect(maxMisses).toBeGreaterThanOrEqual(HELP_AFTER_MISSES);
    }
  });

  it("is deterministic: the same seed plays out identically", () => {
    expect(JSON.stringify(play(42, 0.5).s)).toBe(
      JSON.stringify(play(42, 0.5).s),
    );
  });
});
