import { describe, it, expect, vi, beforeEach } from "vitest";

const { changeLanguage, updateProfile } = vi.hoisted(() => ({
  changeLanguage: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue({ user: {} }),
}));

vi.mock("./index", () => ({ default: { changeLanguage } }));
vi.mock("../api/client", () => ({ api: { auth: { updateProfile } } }));

import { setLanguage } from "./setLanguage";

describe("setLanguage", () => {
  beforeEach(() => {
    changeLanguage.mockClear();
    updateProfile.mockClear();
    localStorage.clear();
  });

  it("changes language and caches to localStorage", async () => {
    await setLanguage("de", { authed: false });
    expect(changeLanguage).toHaveBeenCalledWith("de");
    expect(localStorage.getItem("lang")).toBe("de");
  });

  it("does NOT PATCH /me when logged out", async () => {
    await setLanguage("fr", { authed: false });
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("PATCHes /me with language when authed", async () => {
    await setLanguage("es", { authed: true });
    expect(updateProfile).toHaveBeenCalledWith(undefined, "es");
  });

  it("resolves unsupported tags to en before applying", async () => {
    await setLanguage("ja", { authed: false });
    expect(changeLanguage).toHaveBeenCalledWith("en");
    expect(localStorage.getItem("lang")).toBe("en");
  });
});
