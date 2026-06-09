import { renderHook } from "@testing-library/react";
import { useDocumentHead } from "./useDocumentHead";

describe("useDocumentHead", () => {
  it("sets document.title", () => {
    renderHook(() => useDocumentHead({ title: "Privacy — flashkarte" }));
    expect(document.title).toBe("Privacy — flashkarte");
  });
  it("upserts a description meta tag", () => {
    renderHook(() =>
      useDocumentHead({ title: "T", description: "hello world" }),
    );
    const tag = document.querySelector('meta[name="description"]');
    expect(tag?.getAttribute("content")).toBe("hello world");
  });
  it("updates the same description tag on rerender (no duplicates)", () => {
    const { rerender } = renderHook(
      ({ d }) => useDocumentHead({ title: "T", description: d }),
      { initialProps: { d: "first" } },
    );
    rerender({ d: "second" });
    const tags = document.querySelectorAll('meta[name="description"]');
    expect(tags.length).toBe(1);
    expect(tags[0].getAttribute("content")).toBe("second");
  });
});
