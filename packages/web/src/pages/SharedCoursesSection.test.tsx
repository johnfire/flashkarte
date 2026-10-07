import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { api } from "../api/client";
import type { SharedCourse, SharedSubject } from "../api/types";
import "../i18n";
import { SharedCoursesSection } from "./SharedCoursesSection";

vi.mock("../api/client", async () => {
  const actual =
    await vi.importActual<typeof import("../api/client")>("../api/client");
  return {
    ...actual,
    reportClientError: vi.fn(),
    api: {
      ...actual.api,
      courses: {
        ...actual.api.courses,
        listShared: vi.fn(),
        subscribe: vi.fn(),
      },
      learn: { ...actual.api.learn, listShared: vi.fn(), enroll: vi.fn() },
    },
  };
});

const DECK_COURSE: SharedCourse = {
  id: "c1",
  referenceNumber: 3,
  title: "Biologie Decks",
  description: null,
  contentLanguage: "de",
  decksTotal: 4,
  author: "Frau Huber",
  subscribed: false,
  scopes: ["class"],
};
const LESSON_COURSE: SharedSubject = {
  id: "s1",
  referenceNumber: 4,
  title: "Zellbiologie",
  description: null,
  locale: "de",
  author: null,
  enrolled: false,
  scopes: ["school"],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.courses.listShared).mockResolvedValue({
    courses: [DECK_COURSE],
  });
  vi.mocked(api.learn.listShared).mockResolvedValue({
    courses: [LESSON_COURSE],
  });
});

test("lists both kinds of shared course with where they came from", async () => {
  render(<SharedCoursesSection onAdded={vi.fn()} />);
  expect(await screen.findByText("Zellbiologie")).toBeInTheDocument();
  expect(screen.getByText("Biologie Decks")).toBeInTheDocument();
  expect(screen.getByText(/from your school/)).toBeInTheDocument();
  expect(
    screen.getByText(/shared with your class · Frau Huber/),
  ).toBeInTheDocument();
});

test("adding enrols in a structured course and subscribes to a deck-course", async () => {
  vi.mocked(api.learn.enroll).mockResolvedValue(undefined);
  vi.mocked(api.courses.subscribe).mockResolvedValue(undefined);
  const onAdded = vi.fn();
  render(<SharedCoursesSection onAdded={onAdded} />);

  const [first, second] = await screen.findAllByRole("button", {
    name: "Add",
  });
  await userEvent.click(first);
  expect(api.learn.enroll).toHaveBeenCalledWith("s1");
  await userEvent.click(second);
  expect(api.courses.subscribe).toHaveBeenCalledWith("c1");
  expect(onAdded).toHaveBeenCalledTimes(2);
  await waitFor(() =>
    expect(screen.queryByText("Zellbiologie")).not.toBeInTheDocument(),
  );
});

test("one list failing still shows the other", async () => {
  vi.mocked(api.courses.listShared).mockRejectedValue(new Error("offline"));
  render(<SharedCoursesSection onAdded={vi.fn()} />);
  expect(await screen.findByText("Zellbiologie")).toBeInTheDocument();
  expect(screen.queryByText("Biologie Decks")).not.toBeInTheDocument();
});

test("renders nothing when everything shared is already added", async () => {
  vi.mocked(api.courses.listShared).mockResolvedValue({
    courses: [{ ...DECK_COURSE, subscribed: true }],
  });
  vi.mocked(api.learn.listShared).mockResolvedValue({
    courses: [{ ...LESSON_COURSE, enrolled: true }],
  });
  const { container } = render(<SharedCoursesSection onAdded={vi.fn()} />);
  await waitFor(() => expect(api.learn.listShared).toHaveBeenCalled());
  expect(container).toBeEmptyDOMElement();
});
