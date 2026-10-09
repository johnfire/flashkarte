import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";
import "../../i18n";
import { LandingHero } from "./LandingHero";

describe("LandingHero", () => {
  test("keeps the product message and introduces local AI course creation", () => {
    render(
      <MemoryRouter>
        <LandingHero />
      </MemoryRouter>,
    );

    const title = screen.getByRole("heading", {
      level: 1,
      name: "LearnWohl",
    });
    expect(title).toHaveTextContent("LW");
    expect(title).toHaveTextContent("LearnWohl");
    expect(
      screen.getByText(
        "Flashcard decks and full custom courses for your study needs.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Bring your local AI to create courses for you, your friends, your coworkers, and anyone who needs them.",
      ),
    ).toBeInTheDocument();
  });
});
