import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import type { LearnerLesson, LearnerOutline } from "../api/learn-types";
import "../i18n";
import { OutlinePage } from "./OutlinePage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: { learn: { outline: vi.fn() } },
}));
const outlineMock = api.learn.outline as unknown as ReturnType<typeof vi.fn>;

const lesson = (over: Partial<LearnerLesson>): LearnerLesson => ({
  id: "l1",
  slug: "tokens",
  title: "Tokens",
  summary: "What a token is.",
  stage: "finished",
  covers: ["Token", "Vocabulary"],
  access: "available",
  paused: false,
  answered: null,
  result: null,
  unlocksAfter: [],
  ...over,
});
const outline = (lessons: LearnerLesson[], reviews = 0): LearnerOutline => ({
  subject_id: "s1",
  subject_title: "Transformers",
  reviews_due: reviews,
  modules: [{ id: "m1", title: "Input side", lessons }],
});

function open() {
  return render(
    <MemoryRouter initialEntries={["/learn/s1"]}>
      <Routes>
        <Route path="/learn/:subjectId" element={<OutlinePage />} />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => vi.clearAllMocks());

describe("OutlinePage", () => {
  test("shows modules and each lesson's state in words, with the right action", async () => {
    outlineMock.mockResolvedValue(
      outline([
        lesson({
          id: "a",
          slug: "a",
          title: "Alpha",
          access: "passed",
          result: { first_try_right: 3, total: 4 },
        }),
        lesson({ id: "b", slug: "b", title: "Beta", access: "available" }),
        lesson({
          id: "c",
          slug: "c",
          title: "Gamma",
          access: "in_progress",
          paused: true,
        }),
        lesson({
          id: "d",
          slug: "d",
          title: "Delta",
          access: "locked",
          unlocksAfter: [
            {
              lessonId: "b",
              slug: "b",
              title: "Beta",
              reason: "r",
              passed: false,
            },
            {
              lessonId: "a",
              slug: "a",
              title: "Alpha",
              reason: "r",
              passed: true,
            },
          ],
        }),
      ]),
    );
    open();
    expect(
      await screen.findByRole("heading", { name: "Transformers" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Input side" })).toBeTruthy();
    const row = (title: string) =>
      screen.getByRole("heading", { name: title }).closest("li")!;

    expect(within(row("Alpha")).getByText("Passed")).toBeTruthy();
    expect(
      within(row("Alpha")).getByText("3 of 4 right on the first try"),
    ).toBeTruthy();
    expect(
      within(row("Alpha"))
        .getByRole("link", { name: "Read again" })
        .getAttribute("href"),
    ).toBe("/learn/s1/lessons/a/read");
    expect(
      within(row("Beta"))
        .getByRole("link", { name: "Start" })
        .getAttribute("href"),
    ).toBe("/learn/s1/lessons/b");
    expect(
      within(row("Gamma")).getByText(/In progress · Come back later/),
    ).toBeTruthy();
    expect(
      within(row("Gamma")).getByRole("link", { name: "Continue" }),
    ).toBeTruthy();
    expect(within(row("Delta")).getByText("Locked")).toBeTruthy();
    // Only what is still missing is listed, and a locked lesson has no way in.
    expect(
      within(row("Delta")).getByText("Opens after you pass: Beta"),
    ).toBeTruthy();
    expect(within(row("Delta")).queryByRole("link")).toBeNull();
  });

  test("offers the reviews that are due, and says when a lesson is still a draft", async () => {
    outlineMock.mockResolvedValue(outline([lesson({ stage: "testing" })], 5));
    open();
    const link = await screen.findByRole("link", {
      name: "5 questions are due for review",
    });
    expect(link.getAttribute("href")).toBe("/learn/s1/reviews");
    expect(screen.getByText("Draft: still being tested")).toBeTruthy();
  });

  test("says so when a subject has no lessons", async () => {
    outlineMock.mockResolvedValue({ ...outline([]), modules: [] });
    open();
    expect(
      await screen.findByText("No lessons in this subject yet."),
    ).toBeTruthy();
  });
});
