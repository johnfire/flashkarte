import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import type { CourseSummary } from "../api/types";
import "../i18n";
import { CoursesPage } from "./CoursesPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    courses: {
      list: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
    },
  },
  reportClientError: vi.fn(),
}));

const mockedApi = api.courses as unknown as {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};

const course: CourseSummary = {
  id: "c1",
  user_id: "u1",
  title: "Circuits 101",
  description: null,
  is_public: false,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  decks_total: 3,
  decks_mastered: 1,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <CoursesPage />
    </MemoryRouter>,
  );
}

describe("CoursesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.list.mockResolvedValue([course]);
  });

  test("lists the user's courses with progress", async () => {
    renderPage();
    expect(await screen.findByText("Circuits 101")).toBeInTheDocument();
    expect(screen.getByText("1 / 3 decks mastered")).toBeInTheDocument();
  });

  test("shows an empty hint when there are no courses", async () => {
    mockedApi.list.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/No courses yet/)).toBeInTheDocument();
  });

  test("creates a course and adds it to the list", async () => {
    mockedApi.list.mockResolvedValue([]);
    mockedApi.create.mockResolvedValue({
      ...course,
      id: "c2",
      title: "New Skill",
    });
    renderPage();
    await screen.findByText(/No courses yet/);

    await userEvent.type(
      screen.getByPlaceholderText("New course title"),
      "New Skill",
    );
    await userEvent.click(screen.getByRole("button", { name: "New course" }));

    expect(mockedApi.create).toHaveBeenCalledWith("New Skill");
    expect(await screen.findByText("New Skill")).toBeInTheDocument();
  });

  test("deletes a course after confirmation", async () => {
    vi.stubGlobal("confirm", () => true);
    mockedApi.remove.mockResolvedValue(undefined);
    renderPage();
    await screen.findByText("Circuits 101");

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mockedApi.remove).toHaveBeenCalledWith("c1"));
    expect(screen.queryByText("Circuits 101")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
