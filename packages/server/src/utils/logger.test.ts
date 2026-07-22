import { logger } from "./logger";

describe("logger", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("writes JSON with source, message, and level", () => {
    logger.info("test.source", "hello world", { extra: 1 });
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(entry).toMatchObject({
      level: "info",
      source: "test.source",
      msg: "hello world",
      extra: 1,
    });
    expect(entry.ts).toMatch(/^\d{4}-/);
    expect(entry.correlationId).toBeUndefined();
  });

  it("carries the correlation ID from withCorrelationId", () => {
    logger.withCorrelationId("corr-42", () => {
      logger.warn("test.source", "with id");
      const entry = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
      expect(entry.correlationId).toBe("corr-42");
      expect(entry.source).toBe("test.source");
      expect(entry.level).toBe("warn");
    });
  });

  it("routes error level to console.error", () => {
    logger.error("test.source", "oops");
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(consoleErrorSpy.mock.calls[0][0] as string);
    expect(entry.level).toBe("error");
    expect(entry.msg).toBe("oops");
  });

  it("redacts tokens from structured log metadata", () => {
    logger.info("test.source", "request", {
      authorization: "Bearer secret-value",
      error: "request failed with fk_secret-value",
    });
    const entry = JSON.parse(consoleLogSpy.mock.calls[0][0] as string);
    expect(entry.authorization).toBe("[REDACTED]");
    expect(entry.error).not.toContain("secret-value");
  });
});
