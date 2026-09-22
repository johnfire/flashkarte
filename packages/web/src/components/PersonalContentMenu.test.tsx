import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, test, vi } from "vitest";
import "../i18n";
import { PersonalContentMenu } from "./PersonalContentMenu";

const logout = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ user: { accountType: "admin" }, logout }),
}));

describe("PersonalContentMenu", () => {
  test("shares the deck actions and signs out", async () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="*" element={<PersonalContentMenu />} />
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("navigation")).toHaveAccessibleName(
      "My content menu",
    );
    expect(screen.getByRole("link", { name: "New deck" })).toHaveAttribute(
      "href",
      "/decks/new",
    );
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute(
      "href",
      "/library",
    );
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute(
      "href",
      "/help",
    );
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );

    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(logout).toHaveBeenCalledOnce();
    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });
});
