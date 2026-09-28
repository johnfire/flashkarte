import type { Request } from "express";
import { loginSecurityContext } from "./login-security-context";

function requestWith(userAgent: string, ip: string): Request {
  return {
    get: (name: string) => (name === "user-agent" ? userAgent : undefined),
    ip,
  } as Request;
}

describe("loginSecurityContext", () => {
  it("keeps a valid IP and records only browser and platform categories", () => {
    const context = loginSecurityContext(
      requestWith(
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/132.0 Safari/537.36",
        "203.0.113.12",
      ),
    );

    expect(context).toEqual({
      sourceIp: "203.0.113.12",
      browser: "chrome",
      platform: "linux",
    });
  });

  it("does not persist malformed source addresses or raw user agents", () => {
    const context = loginSecurityContext(
      requestWith("unrecognised-agent/private-value", "not-an-ip"),
    );

    expect(context).toEqual({
      sourceIp: null,
      browser: "other",
      platform: "other",
    });
  });
});
