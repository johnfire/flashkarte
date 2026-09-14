import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OptionsFieldList } from "./OptionsFieldList";
import "../i18n";

describe("OptionsFieldList", () => {
  test("edits an option's text and target", () => {
    const onChange = vi.fn();
    render(
      <OptionsFieldList
        options={[{ text: "Go left", goto: "b" }]}
        onChange={onChange}
        availableTargets={["a", "b", "end"]}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Go left"), {
      target: { value: "Go right" },
    });
    expect(onChange).toHaveBeenCalledWith([{ text: "Go right", goto: "b" }]);

    fireEvent.change(screen.getByDisplayValue("b"), {
      target: { value: "end" },
    });
    expect(onChange).toHaveBeenCalledWith([{ text: "Go left", goto: "end" }]);
  });

  test("adds and removes an option", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <OptionsFieldList
        options={[]}
        onChange={onChange}
        availableTargets={["end"]}
      />,
    );

    fireEvent.click(screen.getByText("Add option"));
    expect(onChange).toHaveBeenCalledWith([{ text: "", goto: "" }]);

    rerender(
      <OptionsFieldList
        options={[{ text: "Go left", goto: "end" }]}
        onChange={onChange}
        availableTargets={["end"]}
      />,
    );
    fireEvent.click(screen.getByText("Remove"));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
