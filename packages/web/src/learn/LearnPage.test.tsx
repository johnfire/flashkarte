import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { api } from "../api/client";
import "../i18n";
import { LearnPage } from "./LearnPage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  api: { learn: { subjects: vi.fn() } },
}));
const subjects = api.learn.subjects as unknown as ReturnType<typeof vi.fn>;
beforeEach(() => vi.clearAllMocks());

describe("LearnPage", () => {
  test("lists subjects, each linking to its outline", async () => {
    subjects.mockResolvedValue([
      {
        id: "s1",
        title: "Transformers",
        description: "How they work",
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
    expect(screen.getByText("1 concept")).toBeTruthy();
  });

  test("says so when there are none", async () => {
    subjects.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <LearnPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/No subjects yet/)).toBeTruthy();
  });
});
