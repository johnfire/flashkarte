import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import type { PublicCourseSummary } from "../api/types";
import "../i18n";
import { PublicCoursesPage } from "./PublicCoursesPage";

const navigate = vi.fn();
vi.mock("react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router")>()),
  useNavigate: () => navigate,
}));

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: {
    publicCourses: { list: vi.fn(), clone: vi.fn() },
  },
}));

const mockedApi = api.publicCourses as unknown as {
  list: ReturnType<typeof vi.fn>;
  clone: ReturnType<typeof vi.fn>;
};

const course: PublicCourseSummary = {
  id: "c1",
  user_id: "owner",
  title: "Intro to Circuits",
  description: "The basics of circuit analysis",
  is_public: true,
  created_at: "2026-01-01",
  updated_at: "2026-01-01",
  decks_total: 4,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <PublicCoursesPage />
    </MemoryRouter>,
  );
}

describe("PublicCoursesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApi.list.mockResolvedValue([course]);
  });

  test("lists public courses", async () => {
    renderPage();
    expect(await screen.findByText("Intro to Circuits")).toBeInTheDocument();
    expect(screen.getByText("4 decks")).toBeInTheDocument();
  });

  test("shows an empty hint when there are none", async () => {
    mockedApi.list.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(/No public courses yet/),
    ).toBeInTheDocument();
  });

  test("clones a course and navigates to it", async () => {
    mockedApi.clone.mockResolvedValue({
      course: { ...course, id: "new-c1" },
      decks_cloned: 4,
      source_id: "c1",
    });
    renderPage();
    await screen.findByText("Intro to Circuits");

    await userEvent.click(screen.getByRole("button", { name: "Clone" }));

    await waitFor(() => expect(mockedApi.clone).toHaveBeenCalledWith("c1"));
    expect(navigate).toHaveBeenCalledWith("/courses/new-c1");
  });

  test("shows an error and stays put when cloning fails", async () => {
    mockedApi.clone.mockRejectedValue(new Error("boom"));
    renderPage();
    await screen.findByText("Intro to Circuits");

    await userEvent.click(screen.getByRole("button", { name: "Clone" }));

    expect(await screen.findByText(/Couldn't clone/)).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });
});
