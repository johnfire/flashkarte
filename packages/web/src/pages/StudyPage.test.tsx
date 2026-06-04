import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { StudyPage } from "./StudyPage";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { study: { batch: vi.fn(), review: vi.fn() } },
  ApiError: class ApiError extends Error {},
  reportClientError: vi.fn(),
}));

const mockApi = api as unknown as {
  study: { batch: ReturnType<typeof vi.fn>; review: ReturnType<typeof vi.fn> };
};

function renderStudy() {
  return render(
    <MemoryRouter initialEntries={["/decks/d1/study"]}>
      <Routes>
        <Route path="/decks/:id/study" element={<StudyPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StudyPage", () => {
  beforeEach(() => vi.clearAllMocks());

  test("reveals the answer then grades via the API", async () => {
    mockApi.study.batch.mockResolvedValue([
      { id: "c1", content: { front: "Front?", back: "Back!" }, category: null },
    ]);
    mockApi.study.review.mockResolvedValue({});

    renderStudy();

    expect(await screen.findByText("Front?")).toBeInTheDocument();
    expect(screen.queryByText("Back!")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Show answer/ }));
    expect(screen.getByText("Back!")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Good" }));
    expect(mockApi.study.review).toHaveBeenCalledWith("c1", 4);

    await waitFor(() =>
      expect(screen.getByText(/Session complete/)).toBeInTheDocument(),
    );
  });

  test("empty batch shows an encouraging summary", async () => {
    mockApi.study.batch.mockResolvedValue([]);
    renderStudy();
    expect(await screen.findByText(/Session complete/)).toBeInTheDocument();
    expect(screen.getByText(/Nothing due right now/)).toBeInTheDocument();
  });
});
