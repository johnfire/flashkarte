import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Block } from "@flashkarte/shared";
import { assetDataUrl } from "../api/client";
import "../i18n";
import { LessonBlocks } from "./LessonBlocks";

vi.mock("../api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/client")>()),
  assetDataUrl: vi.fn(),
}));
const fetchAsset = assetDataUrl as unknown as ReturnType<typeof vi.fn>;
const ID = "0a1b2c3d-0000-4000-8000-000000000001";

const show = (blocks: Block[]) =>
  render(
    <MemoryRouter initialEntries={["/learn/s1/lessons/x"]}>
      <Routes>
        <Route
          path="/learn/:subjectId/lessons/:slug"
          element={<LessonBlocks blocks={blocks} />}
        />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => vi.clearAllMocks());

describe("display formulas", () => {
  const drawn: Block = {
    type: "formula",
    latex: "R = V / I",
    spoken: "R equals V over I",
    assetId: ID,
    widthEm: 4.373,
    heightEm: 1.131,
    depthEm: 0.283,
  };

  test("shows the server's drawing at its measured size, read out as its spoken text", async () => {
    fetchAsset.mockResolvedValue("data:image/svg+xml,formula");
    show([drawn]);
    const image = await screen.findByRole("img", { name: "R equals V over I" });
    expect(image.getAttribute("src")).toBe("data:image/svg+xml,formula");
    expect((image as HTMLImageElement).style.width).toBe("4.373em");
    expect((image as HTMLImageElement).style.height).toBe("1.131em");
    // A single-colour drawing follows the theme: it is inverted on a dark page.
    expect(image.className).toContain("dark:invert");
    expect(fetchAsset).toHaveBeenCalledWith("s1", ID);
  });

  test("shows the LaTeX as text until the drawing arrives, and if it never does", async () => {
    fetchAsset.mockRejectedValue(new Error("offline"));
    show([drawn]);
    expect(screen.getByLabelText("R equals V over I").textContent).toBe(
      "R = V / I",
    );
    await vi.waitFor(() => expect(fetchAsset).toHaveBeenCalled());
    expect(screen.getByLabelText("R equals V over I").textContent).toBe(
      "R = V / I",
    );
  });

  test("a formula the server has not drawn (an old screen) shows its LaTeX without fetching", () => {
    show([{ type: "formula", latex: "x^2", spoken: "x squared" }]);
    expect(screen.getByLabelText("x squared").textContent).toBe("x^2");
    expect(fetchAsset).not.toHaveBeenCalled();
  });

  test("a wide formula scrolls sideways instead of overflowing the page", async () => {
    fetchAsset.mockResolvedValue("data:image/svg+xml,wide");
    const { container } = show([
      { ...(drawn as object), widthEm: 60 } as Block,
    ]);
    await screen.findByRole("img");
    expect(container.querySelector(".overflow-x-auto")).toBeTruthy();
  });
});

describe("maths inside a sentence", () => {
  const sentence: Block = {
    type: "paragraph",
    spans: [
      { text: "The key size " },
      {
        text: "d_k",
        math: {
          spoken: "d sub k",
          assetId: ID,
          widthEm: 1.099,
          heightEm: 0.964,
          depthEm: 0.179,
        },
      },
      { text: " is small." },
    ],
  };

  test("sits on the line: sized in em and dropped below the baseline by its depth", async () => {
    fetchAsset.mockResolvedValue("data:image/svg+xml,dk");
    const { container } = show([sentence]);
    const symbol = (await screen.findByRole("img", {
      name: "d sub k",
    })) as HTMLImageElement;
    expect(symbol.style.width).toBe("1.099em");
    expect(symbol.style.height).toBe("0.964em");
    expect(symbol.style.verticalAlign).toBe("-0.179em");
    expect(container.textContent).toContain("The key size ");
    expect(container.textContent).toContain(" is small.");
  });

  test("reserves its space while loading, so the sentence does not jump", () => {
    fetchAsset.mockReturnValue(new Promise(() => undefined));
    show([sentence]);
    const placeholder = screen.getByRole("img", {
      name: "d sub k",
    }) as HTMLElement;
    expect(placeholder.tagName).toBe("SPAN");
    expect(placeholder.style.width).toBe("1.099em");
    expect(placeholder.style.verticalAlign).toBe("-0.179em");
  });

  test("falls back to the LaTeX in code when it cannot be drawn, in lists too", async () => {
    fetchAsset.mockRejectedValue(new Error("gone"));
    show([
      {
        type: "list",
        ordered: false,
        items: [
          [
            { text: "value " },
            {
              text: "x_i",
              math: { assetId: ID, widthEm: 1, heightEm: 1, depthEm: 0 },
            },
          ],
        ],
      },
    ]);
    await vi.waitFor(() =>
      expect(screen.getByText("x_i").tagName).toBe("CODE"),
    );
  });

  test("an old span with no drawing shows its LaTeX without fetching", () => {
    show([{ type: "paragraph", spans: [{ text: "n", math: {} }] }]);
    expect(screen.getByText("n").tagName).toBe("CODE");
    expect(fetchAsset).not.toHaveBeenCalled();
  });
});
