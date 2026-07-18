import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { useAsync } from "./use-async";

describe("useAsync", () => {
  test("moves from loading to loaded data", async () => {
    const loadValue = vi.fn().mockResolvedValue(["loaded"]);
    const { result } = renderHook(() => useAsync(loadValue, []));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toEqual(["loaded"]));
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test("captures loader failures", async () => {
    const loadError = new Error("load failed");
    const loadValue = vi.fn().mockRejectedValue(loadError);
    const { result } = renderHook(() => useAsync(loadValue, []));

    await waitFor(() => expect(result.current.error).toBe(loadError));
    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test("reloads with arguments and allows optimistic updates", async () => {
    const loadValue = vi.fn().mockResolvedValueOnce("first");
    const { result } = renderHook(() => useAsync(loadValue, ["initial"]));
    await waitFor(() => expect(result.current.data).toBe("first"));

    act(() => result.current.setData("optimistic"));
    expect(result.current.data).toBe("optimistic");

    loadValue.mockResolvedValueOnce("searched");
    await act(() => result.current.reload("query"));
    expect(loadValue).toHaveBeenLastCalledWith("query");
    expect(result.current.data).toBe("searched");
  });
});
