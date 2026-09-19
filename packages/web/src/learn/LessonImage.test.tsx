import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { ImageBlock } from "@flashkarte/shared";
import { assetDataUrl } from "../api/client";
import "../i18n";
import { LessonImage } from "./LessonImage";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  assetDataUrl: vi.fn(),
}));
const fetchAsset = assetDataUrl as unknown as ReturnType<typeof vi.fn>;

const ASSET = "0a1b2c3d-0000-4000-8000-000000000001";
const block = (over: Partial<ImageBlock> = {}): ImageBlock => ({
  type: "image",
  src: `asset:${ASSET}`,
  alt: "An RC low-pass filter",
  display: "inline",
  ...over,
});
const show = (image: ImageBlock) =>
  render(
    <MemoryRouter initialEntries={["/learn/s1/lessons/rc"]}>
      <Routes>
        <Route
          path="/learn/:subjectId/lessons/:slug"
          element={<LessonImage block={image} />}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

describe("LessonImage", () => {
  test("fetches a stored diagram with the learner's sign-in and shows it with its alt text", async () => {
    fetchAsset.mockResolvedValue("data:image/svg+xml,diagram");
    show(block({ caption: "Figure 1" }));
    const image = await screen.findByRole("img", {
      name: "An RC low-pass filter",
    });
    expect(image.getAttribute("src")).toBe("data:image/svg+xml,diagram");
    expect(fetchAsset).toHaveBeenCalledWith("s1", ASSET);
    expect(screen.getByText("Figure 1")).toBeTruthy();
  });

  test("shows a web link or app path as it is, without fetching", () => {
    show(block({ src: "https://example.com/rc.svg" }));
    expect(
      screen
        .getByRole("img", { name: "An RC low-pass filter" })
        .getAttribute("src"),
    ).toBe("https://example.com/rc.svg");
    expect(fetchAsset).not.toHaveBeenCalled();
  });

  test("never shows a source that is not https, an app path or a stored diagram", () => {
    show(block({ src: "javascript:alert(1)" }));
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByRole("alert").textContent).toBe(
      "This image could not be loaded.",
    );
  });

  test("says so, and still gives the alt text, when the diagram cannot be loaded", async () => {
    fetchAsset.mockRejectedValue(new Error("404"));
    show(block());
    expect((await screen.findByRole("alert")).textContent).toBe(
      "This image could not be loaded.",
    );
    expect(screen.getByText("An RC low-pass filter")).toBeTruthy();
  });

  test("an expandable diagram opens full-screen from a button, zooms, and closes", async () => {
    fetchAsset.mockResolvedValue("data:image/svg+xml,big");
    show(block({ display: "expandable", caption: "The whole circuit" }));
    const open = await screen.findByRole("button", { name: "Show diagram" });
    expect(screen.getByText("The whole circuit")).toBeTruthy();

    await userEvent.click(open);
    const dialog = screen.getByRole("dialog", {
      name: "An RC low-pass filter",
      hidden: true,
    });
    expect(dialog.hasAttribute("open")).toBe(true);
    const image = dialog.querySelector("img") as HTMLImageElement;
    expect(image.style.width).toBe("100%");

    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(image.style.width).toBe("150%");
    await userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    await userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(image.style.width).toBe("100%");
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Fit to screen" }),
    );
    expect(image.style.width).toBe("100%");

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(dialog.hasAttribute("open")).toBe(false));
  });
});
