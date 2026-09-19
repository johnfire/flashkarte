import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import type { LessonStep } from "../api/learn-types";
import "../i18n";
import { LessonPage } from "./LessonPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    learn: {
      start: vi.fn(),
      next: vi.fn(),
      back: vi.fn(),
      carryOn: vi.fn(),
      pause: vi.fn(),
      answer: vi.fn(),
      screens: vi.fn(),
      comment: vi.fn(),
    },
  },
}));
const learn = api.learn as unknown as Record<string, ReturnType<typeof vi.fn>>;

const para = (text: string) => [
  { type: "paragraph" as const, spans: [{ text }] },
];
const lesson = { slug: "tokens", title: "Tokens", stage: "testing" };
const screenStep = (index: number, total = 2): LessonStep => ({
  kind: "screen",
  number: String(index + 1),
  index,
  total,
  can_go_back: index > 0,
  blocks: para(`Screen text ${index + 1}`),
});
const questionStep = (over: object = {}): LessonStep => ({
  kind: "question",
  question_id: "q1",
  presentation_id: "p1",
  prompt: para("What is a token?"),
  options: [{ blocks: para("Right one") }, { blocks: para("Wrong one") }],
  answered: 0,
  total: 1,
  misses: 0,
  help_offered: false,
  ...over,
});
const revealed = (over: object = {}) => ({
  correct: true,
  chosen_position: 0,
  correct_position: 0,
  reason: para("It is right because."),
  correct_reason: para("It is right because."),
  misses: 0,
  help_offered: false,
  ...over,
});

function open() {
  return render(
    <MemoryRouter initialEntries={["/learn/s1/lessons/tokens"]}>
      <Routes>
        <Route
          path="/learn/:subjectId/lessons/:slug"
          element={<LessonPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.scrollTo = vi.fn();
});

describe("LessonPage", () => {
  test("reads screens with their numbers, and the last Next starts the questions", async () => {
    learn.start.mockResolvedValue({ lesson, step: screenStep(0) });
    learn.next.mockResolvedValue({ lesson, step: screenStep(1) });
    open();
    expect(await screen.findByText("Screen 1 of 2")).toBeTruthy();
    expect(screen.getByText("Screen text 1")).toBeTruthy();
    expect(screen.getByText("Screen 1", { selector: "p" })).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Back" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Screen 2 of 2")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Start the questions" }),
    ).toBeTruthy();
  });

  test("a wrong answer shows the reason, re-teaches the screen, then asks again", async () => {
    learn.start.mockResolvedValue({ lesson, step: questionStep() });
    learn.answer.mockResolvedValue({
      lesson,
      answer: revealed({
        correct: false,
        chosen_position: 1,
        reason: para("Wrong because."),
      }),
      step: {
        kind: "remediation",
        number: "1",
        position: 1,
        of: 1,
        help_offered: false,
        blocks: para("Teach it again"),
      },
      passed: false,
      unlocked: [],
    });
    learn.carryOn.mockResolvedValue({
      lesson,
      step: questionStep({ presentation_id: "p2", misses: 1 }),
    });
    open();
    await userEvent.click(await screen.findByLabelText("Wrong one"));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("Not quite.")).toBeTruthy();
    expect(screen.getByText("Wrong because.")).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: "Look at the screen again" }),
    );
    expect(await screen.findByText("Re-read 1 of 1")).toBeTruthy();
    expect(screen.getByText("Teach it again")).toBeTruthy();

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("What is a token?")).toBeTruthy();
    expect(learn.carryOn).toHaveBeenCalledTimes(1);
  });

  test("passing shows the result and links to what opened", async () => {
    learn.start.mockResolvedValue({ lesson, step: questionStep() });
    learn.answer.mockResolvedValue({
      lesson,
      answer: revealed(),
      step: { kind: "passed", first_try_right: 1, total: 1, questions: [] },
      passed: true,
      unlocked: [{ slug: "embeddings", title: "Embeddings" }],
    });
    open();
    await userEvent.click(await screen.findByLabelText("Right one"));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Continue" }),
    );
    expect(await screen.findByText("Lesson passed")).toBeTruthy();
    expect(
      screen.getByText("1 of 1 questions right on the first try."),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Embeddings" }).getAttribute("href"),
    ).toBe("/learn/s1/lessons/embeddings");
  });

  test("from the second miss it offers to come back later, and saving sets the lesson aside", async () => {
    learn.start.mockResolvedValue({
      lesson,
      step: questionStep({ help_offered: true, misses: 2 }),
    });
    learn.pause.mockResolvedValue({ lesson, step: { kind: "paused" } });
    open();
    expect(
      await screen.findByText(/This one is giving you trouble/),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Come back later" }),
    );
    expect(await screen.findByText("Saved for later")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Pick up where I left off" }),
    ).toBeTruthy();
  });

  test("open book: the screens can be shown while answering", async () => {
    learn.start.mockResolvedValue({ lesson, step: questionStep() });
    learn.screens.mockResolvedValue({
      lesson,
      screens: [
        { number: "1", blocks: para("First screen text") },
        { number: "2", blocks: para("Second screen text") },
      ],
    });
    open();
    const toggle = await screen.findByRole("button", {
      name: "Show the screens",
    });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(toggle);
    expect(await screen.findByText("First screen text")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Hide the screens" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
  });

  test("comments on a screen against its number", async () => {
    learn.start.mockResolvedValue({ lesson, step: screenStep(1) });
    learn.comment.mockResolvedValue({ id: "c1", number: "2", body: "Why?" });
    open();
    await userEvent.click(
      await screen.findByRole("button", { name: "Comment on screen 2" }),
    );
    await userEvent.type(
      screen.getByLabelText("What is unclear or wrong on screen 2?"),
      "Why?",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save comment" }));
    await waitFor(() =>
      expect(learn.comment).toHaveBeenCalledWith("s1", "2", "Why?"),
    );
    expect(await screen.findByText(/Comment on screen 2 saved/)).toBeTruthy();
  });

  test("shows the server's message when the lesson cannot be opened", async () => {
    const { ApiError } = await import("../api/client");
    learn.start.mockRejectedValue(
      new ApiError(
        422,
        "VALIDATION",
        'This lesson is locked: pass "Tokens" first',
      ),
    );
    open();
    expect((await screen.findByRole("alert")).textContent).toMatch(/locked/);
  });
});
