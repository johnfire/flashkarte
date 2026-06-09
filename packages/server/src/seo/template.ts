import fs from "fs";
import path from "path";

// Read the built index.html once; callers cache the result. Returns null if
// the file is absent (e.g. web not built) so the caller can fall back.
export function loadTemplate(webDist: string): string | null {
  try {
    return fs.readFileSync(path.join(webDist, "index.html"), "utf8");
  } catch {
    return null;
  }
}
