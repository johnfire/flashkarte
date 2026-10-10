import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import "../i18n";
import { FlashcardCourseImportPage } from "./FlashcardCourseImportPage";

vi.mock("../api/client", () => ({
  api: { imports: { flashcardCourse: vi.fn() } },
  ApiError: class ApiError extends Error {},
}));

describe("FlashcardCourseImportPage", () => {
  test("explains both teacher-friendly course file options", () => {
    render(
      <MemoryRouter>
        <FlashcardCourseImportPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("One Excel workbook")).toBeInTheDocument();
    expect(screen.getByText("Three CSV files in a ZIP")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Choose your workbook or ZIP"),
    ).toHaveAttribute("accept", expect.stringContaining(".xlsx"));
  });
});
