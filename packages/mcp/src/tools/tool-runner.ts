import { logger } from "../logger";

export function asText(payload: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(payload, null, 2) },
    ],
  };
}

/** Runs one MCP tool call, logging start, completion and failure with timing. */
export async function runTool<T>(
  toolName: string,
  action: () => Promise<T>,
): Promise<T> {
  const startedAt = Date.now();
  logger.info("mcp.tool", "started", { toolName });
  try {
    const response = await action();
    logger.info("mcp.tool", "completed", {
      toolName,
      durationMs: Date.now() - startedAt,
    });
    return response;
  } catch (error) {
    logger.error("mcp.tool", "failed", {
      toolName,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
