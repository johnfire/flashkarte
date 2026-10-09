import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";
import "../../i18n";
import { LandingSchoolTeacherCallout } from "./LandingSchoolTeacherCallout";

describe("LandingSchoolTeacherCallout", () => {
  test("links visitors to the school and teacher options", () => {
    render(
      <MemoryRouter>
        <LandingSchoolTeacherCallout />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Available for schools and teachers",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Explore options for schools & teachers",
      }),
    ).toHaveAttribute("href", "/schools-and-teachers");
  });
});
