import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import "../i18n";
import { ReviewPage } from "./ReviewPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    learn: {
      reviews: vi.fn(),
      startReview: vi.fn(),
      answerReview: vi.fn(),
      carryOnReview: vi.fn(),
      comment: vi.fn(),
    },
  },
}));
const learn = api.learn as unknown as Record<string, ReturnType<typeof vi.fn>>;
const para = (text: string) => [
  { type: "paragraph" as const, spans: [{ text }] },
];
const question = {
  kind: "question",
  question_id: "q1",
  presentation_id: "p1",
  prompt: para("Which is a token?"),
  options: [{ blocks: para("Right one") }, { blocks: para("Wrong one") }],
  answered: 0,
  total: 1,
  misses: 0,
  help_offered: false,
};
const answer = {
  correct: true,
  chosen_position: 0,
  correct_position: 0,
  reason: para("Yes."),
  correct_reason: para("Yes."),
  misses: 0,
  help_offered: false,
};

function open() {
  return render(
    <MemoryRouter initialEntries={["/learn/s1/reviews"]}>
      <Routes>
        <Route path="/learn/:subjectId/reviews" element={<ReviewPage />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  window.scrollTo = vi.fn();
});

describe("ReviewPage", () => {
  test("says so when nothing is due", async () => {
    learn.reviews.mockResolvedValue({
      due: [],
      upcoming: 2,
      next_due_at: null,
    });
    open();
    expect(
      await screen.findByText("Nothing is due for review right now."),
    ).toBeTruthy();
    expect(learn.startReview).not.toHaveBeenCalled();
  });

  test("asks the first due question alone, and moves on after a right answer", async () => {
    learn.reviews
      .mockResolvedValueOnce({
        due: [{ question_id: "q1", lesson: "tokens", due_at: "x" }],
        upcoming: 0,
        next_due_at: null,
      })
      .mockResolvedValueOnce({ due: [], upcoming: 1, next_due_at: null });
    learn.startReview.mockResolvedValue({ question_id: "q1", step: question });
    learn.answerReview.mockResolvedValue({
      question_id: "q1",
      answer,
      step: { kind: "review_done", first_try: "right" },
      next_due_at: "later",
    });
    open();
    await userEvent.click(await screen.findByLabelText("Right one"));
    await userEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(await screen.findByText("Right.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      await screen.findByText("Done. It will come back later."),
    ).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByText("Nothing is due for review right now."),
    ).toBeTruthy();
  });
});
