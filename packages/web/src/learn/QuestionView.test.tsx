import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import "../i18n";
import type { LessonStep, RevealedAnswer } from "../api/learn-types";
import { QuestionView } from "./QuestionView";

const para = (text: string) => [
  { type: "paragraph" as const, spans: [{ text }] },
];
const question: Extract<LessonStep, { kind: "question" }> = {
  kind: "question",
  question_id: "q1",
  presentation_id: "p1",
  prompt: para("What is a token?"),
  options: [
    { blocks: para("A piece of text") },
    { blocks: para("A password") },
  ],
  answered: 0,
  total: 3,
  misses: 0,
  help_offered: false,
  help: [],
};
const revealed = (over: Partial<RevealedAnswer>): RevealedAnswer => ({
  correct: true,
  chosen_position: 0,
  correct_position: 0,
  reason: para("Because tokens are pieces."),
  correct_reason: para("Because tokens are pieces."),
  misses: 0,
  help_offered: false,
  ...over,
});
const view = (
  answer: RevealedAnswer | null,
  onAnswer = vi.fn(),
  onContinue = vi.fn(),
) =>
  render(
    <QuestionView
      step={question}
      answer={answer}
      disabled={false}
      onAnswer={onAnswer}
      onContinue={onContinue}
    />,
  );

describe("QuestionView", () => {
  test("shows no verdict before answering, and needs a choice to check", async () => {
    const onAnswer = vi.fn();
    view(null, onAnswer);
    expect(screen.queryByText("Right.")).toBeNull();
    expect(screen.queryByText("Not quite.")).toBeNull();
    const check = screen.getByRole("button", { name: "Check answer" });
    expect((check as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByLabelText("A password"));
    await userEvent.click(check);
    expect(onAnswer).toHaveBeenCalledWith(1);
  });

  test("groups the options under the question", () => {
    view(null);
    expect(screen.getByRole("group", { name: /What is a token/ })).toBeTruthy();
    expect(screen.getByText("Question 1 of 3")).toBeTruthy();
  });

  test("after a right answer: says so with the reason, and offers to continue", async () => {
    const onContinue = vi.fn();
    view(revealed({}), vi.fn(), onContinue);
    expect(screen.getByText("Right.")).toBeTruthy();
    expect(screen.getByText("Because tokens are pieces.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalled();
  });

  test("after a wrong answer: marks both options in words, explains, and sends back to the screen", () => {
    view(
      revealed({
        correct: false,
        chosen_position: 1,
        correct_position: 0,
        reason: para("A password is a secret."),
      }),
    );
    expect(screen.getByText("Not quite.")).toBeTruthy();
    expect(screen.getByText("Your answer")).toBeTruthy();
    expect(screen.getByText("Right answer")).toBeTruthy();
    expect(screen.getByText("A password is a secret.")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Look at the screen again" }),
    ).toBeTruthy();
    expect(
      screen
        .getByLabelText("A piece of text", { exact: false })
        .matches(":disabled"),
    ).toBe(true);
  });
});
