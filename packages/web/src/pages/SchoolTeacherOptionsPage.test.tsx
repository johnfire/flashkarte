import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import "../i18n";
import { SchoolTeacherOptionsPage } from "./SchoolTeacherOptionsPage";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ authed: false }),
}));

describe("SchoolTeacherOptionsPage", () => {
  test("explains the options for schools, school teachers, and independent teachers", () => {
    render(
      <MemoryRouter>
        <SchoolTeacherOptionsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "LearnWohl for schools and teachers",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "For schools" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "For teachers in a school",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "For independent teachers and tutors",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Create content your way",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Read the AI and spreadsheet guide" }),
    ).toHaveAttribute("href", "/help/importing-content");
    expect(
      screen.getByRole("link", { name: "Talk to us about LearnWohl" }),
    ).toHaveAttribute(
      "href",
      "mailto:contact@christopherrehm.de?subject=LearnWohl%20for%20schools%20and%20teachers",
    );
  });
});
