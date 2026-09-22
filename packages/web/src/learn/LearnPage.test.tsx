import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import "../i18n";
import { LearnPage } from "./LearnPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: { learn: { subjects: vi.fn(), setPublic: vi.fn() } },
}));
const subjects = api.learn.subjects as unknown as ReturnType<typeof vi.fn>;
const setPublic = api.learn.setPublic as unknown as ReturnType<typeof vi.fn>;

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { id: "owner-1" } }),
}));
beforeEach(() => vi.clearAllMocks());

describe("LearnPage", () => {
  test("lists subjects, each linking to its outline", async () => {
    subjects.mockResolvedValue([
      {
        id: "s1",
        reference_number: 42,
        user_id: "owner-1",
        title: "Transformers",
        description: "How they work",
        is_public: false,
        is_official: false,
        concept_count: 1,
      },
    ]);
    render(
      <MemoryRouter>
        <LearnPage />
      </MemoryRouter>,
    );
    const link = await screen.findByRole("link", { name: /Transformers/ });
    expect(link.getAttribute("href")).toBe("/learn/s1");
    expect(screen.getByRole("list")).toHaveClass("content-card-grid");
    expect(screen.getByText("#42")).toBeTruthy();
    expect(screen.getByText("1 concept")).toBeTruthy();
  });

  test("lets an owner share their course with the community", async () => {
    subjects.mockResolvedValue([
      {
        id: "s1",
        user_id: "owner-1",
        title: "My course",
        description: null,
        is_public: false,
        is_official: false,
        concept_count: 1,
      },
    ]);
    setPublic.mockResolvedValue({ is_public: true });
    render(
      <MemoryRouter>
        <LearnPage />
      </MemoryRouter>,
    );

    await userEvent.click(
      await screen.findByRole("button", { name: "Share to Community" }),
    );

    expect(setPublic).toHaveBeenCalledWith("s1", true);
    expect(await screen.findByText("In Community")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove from Community" }),
    ).toBeInTheDocument();
  });

  test("shows an official course without a sharing control", async () => {
    subjects.mockResolvedValue([
      {
        id: "s1",
        user_id: "owner-1",
        title: "Official course",
        description: null,
        is_public: true,
        is_official: true,
        concept_count: 1,
      },
    ]);
    render(
      <MemoryRouter>
        <LearnPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Official")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Community/ }),
    ).not.toBeInTheDocument();
  });

  test("says so when there are none", async () => {
    subjects.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <LearnPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No courses yet/)).toBeTruthy();
  });
});
