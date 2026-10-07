const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

function verifyBracesDepthGuard() {
  try {
    require(path.resolve("node_modules/braces")).parse("{".repeat(101));
  } catch (error) {
    if (
      error instanceof SyntaxError &&
      error.message === "Brace nesting exceeds maximum depth (100)"
    ) {
      return;
    }
    throw error;
  }
  throw new Error("Braces security patch was not applied");
}

// Production-only installs do not contain the affected development dependency.
if (existsSync(path.resolve("node_modules/braces/package.json"))) {
  const patchCommand = require.resolve("patch-package/dist/index.js");
  const patchProcess = spawnSync(
    process.execPath,
    [patchCommand, "--error-on-fail"],
    { stdio: "inherit" },
  );
  if (patchProcess.error) throw patchProcess.error;
  process.exitCode = patchProcess.status ?? 1;
  if (process.exitCode === 0) verifyBracesDepthGuard();
}
