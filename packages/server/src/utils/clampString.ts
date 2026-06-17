/**
 * Normalise an untrusted request field to a bounded string: returns undefined
 * for non-strings or blank input, otherwise the trimmed value truncated to
 * `max` characters. Shared by the controllers that accept free-text payloads.
 */
export function clampString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}
