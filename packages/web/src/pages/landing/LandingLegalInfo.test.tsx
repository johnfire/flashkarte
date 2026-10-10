import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test } from "vitest";
import "../../i18n";
import { LandingLegalInfo } from "./LandingLegalInfo";

describe("LandingLegalInfo", () => {
  test("shows the footer's legal links and product attribution", () => {
    render(
      <MemoryRouter>
        <LandingLegalInfo />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute(
      "href",
      "/help",
    );
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Impressum" })).toHaveAttribute(
      "href",
      "/impressum",
    );
    expect(
      screen.getByRole("link", { name: "A product of Rehm Consulting" }),
    ).toHaveAttribute("href", "https://christopherrehm.de");
  });
});
