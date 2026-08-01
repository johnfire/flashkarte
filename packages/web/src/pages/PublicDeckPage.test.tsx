import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { vi } from "vitest";
import "../i18n";
import { PublicDeckPage } from "./PublicDeckPage";
import { api } from "../api/client";

vi.spyOn(api.publicLibrary, "preview").mockResolvedValue({
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  title: "Spanish Basics",
  author: "Chris",
  cardCount: 1,
  publishedAt: null,
  cards: [{ front: "hola", category: null }],
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/d/:slug" element={<PublicDeckPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("PublicDeckPage", () => {
  it("shows the question but never the answer for anonymous visitors", async () => {
    renderAt("/d/spanish-basics-a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    await waitFor(() =>
      expect(screen.getByText("Spanish Basics")).toBeInTheDocument(),
    );
    expect(screen.getByText("hola")).toBeInTheDocument();
    expect(screen.queryByText(/adiós/)).not.toBeInTheDocument(); // no answers in DOM
  });
});
