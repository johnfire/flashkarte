import { describe, test, expect, vi, beforeEach } from "vitest";
import { api, ApiError, setAccessToken } from "./client";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("api client", () => {
  beforeEach(() => {
    setAccessToken(null);
    vi.restoreAllMocks();
  });

  test("GET attaches Bearer token and parses JSON", async () => {
    setAccessToken("tok123");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, [{ id: "d1" }]));
    vi.stubGlobal("fetch", fetchMock);

    const decks = await api.decks.list();

    expect(decks).toEqual([{ id: "d1" }]);
    const [, opts] = fetchMock.mock.calls[0];
    expect((opts.headers as Headers).get("Authorization")).toBe(
      "Bearer tok123",
    );
  });

  test("401 triggers a refresh-and-retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: "fresh" }))
      .mockResolvedValueOnce(jsonResponse(200, [{ id: "d1" }]));
    vi.stubGlobal("fetch", fetchMock);

    const decks = await api.decks.list();

    expect(decks).toEqual([{ id: "d1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh");
  });

  test("concurrent 401s share a single refresh", async () => {
    // Two parallel requests both 401 first, then succeed on retry. Only ONE
    // /auth/refresh must be issued (rotating tokens make a second one fail).
    const deckResponses = [
      jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }),
      jsonResponse(401, { error: { code: "UNAUTHENTICATED" } }),
      jsonResponse(200, [{ id: "d1" }]),
      jsonResponse(200, [{ id: "d1" }]),
    ];
    let deckIdx = 0;
    let refreshCalls = 0;
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/auth/refresh") {
        refreshCalls++;
        return Promise.resolve(jsonResponse(200, { accessToken: "fresh" }));
      }
      return Promise.resolve(deckResponses[deckIdx++]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const [a, b] = await Promise.all([api.decks.list(), api.decks.list()]);

    expect(a).toEqual([{ id: "d1" }]);
    expect(b).toEqual([{ id: "d1" }]);
    expect(refreshCalls).toBe(1);
  });

  test("non-ok maps to ApiError with code + message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(422, {
        error: { code: "VALIDATION_ERROR", message: "bad" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.decks.create("x")).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "bad",
    });
    await expect(api.decks.create("x")).rejects.toBeInstanceOf(ApiError);
  });
});
