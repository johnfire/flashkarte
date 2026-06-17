import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import "../i18n";
import { PasswordInput } from "./PasswordInput";

describe("PasswordInput", () => {
  it("masks by default and exposes id + autocomplete for password managers", () => {
    render(
      <PasswordInput
        id="password"
        value="secret"
        onChange={() => {}}
        autoComplete="current-password"
      />,
    );
    const input = document.getElementById("password") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe("password");
    expect(input.getAttribute("autocomplete")).toBe("current-password");
  });

  it("toggles visibility when the show/hide button is pressed", async () => {
    render(
      <PasswordInput
        id="password"
        value="secret"
        onChange={() => {}}
        autoComplete="new-password"
      />,
    );
    const input = document.getElementById("password") as HTMLInputElement;
    const toggle = screen.getByRole("button");
    expect(input.type).toBe("password");
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    await userEvent.click(toggle);
    expect(input.type).toBe("text");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
  });

  it("reports edits through onChange", async () => {
    const onChange = vi.fn();
    render(
      <PasswordInput
        id="password"
        value=""
        onChange={onChange}
        autoComplete="new-password"
      />,
    );
    await userEvent.type(
      document.getElementById("password") as HTMLInputElement,
      "x",
    );
    expect(onChange).toHaveBeenCalledWith("x");
  });
});
