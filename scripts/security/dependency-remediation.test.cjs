const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { Worker } = require("node:worker_threads");
const { spawnSync } = require("node:child_process");
const proxyAddress = require("proxy-addr");
const { SourceMapConsumer, SourceNode } = require("source-map-js");
const { loadNycConfig } = require("@istanbuljs/load-nyc-config");
const sharp = require("sharp");
const { gte } = require("semver");
const braces = require("braces");
const micromatch = require("micromatch");
const lockfile = require("../../package-lock.json");

async function copyBraceDependencies(fixtureDirectory) {
  for (const dependency of [
    "braces",
    "fill-range",
    "to-regex-range",
    "is-number",
  ]) {
    await fs.cp(
      path.dirname(require.resolve(`${dependency}/package.json`)),
      path.join(fixtureDirectory, "node_modules", dependency),
      { recursive: true },
    );
  }
}

async function writeBrokenBracePatch(fixtureDirectory) {
  await fs.mkdir(path.join(fixtureDirectory, "patches"));
  await fs.writeFile(
    path.join(fixtureDirectory, "patches/braces+3.0.3.patch"),
    [
      "diff --git a/node_modules/braces/index.js b/node_modules/braces/index.js",
      "--- a/node_modules/braces/index.js",
      "+++ b/node_modules/braces/index.js",
      "@@ -1 +1 @@",
      "-this context does not exist",
      "+replacement",
      "",
    ].join("\n"),
  );
}

test("install hook permits production installs but fails on broken patches", async (context) => {
  const fixtureDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "braces-patch-"),
  );
  context.after(() =>
    fs.rm(fixtureDirectory, { recursive: true, force: true }),
  );
  const hook = path.join(__dirname, "apply-dependency-patches.cjs");
  const productionInstall = spawnSync(process.execPath, [hook], {
    cwd: fixtureDirectory,
    encoding: "utf8",
  });
  assert.ifError(productionInstall.error);
  assert.equal(productionInstall.status, 0);
  await fs.writeFile(
    path.join(fixtureDirectory, "package.json"),
    JSON.stringify({ name: "patch-fixture", version: "1.0.0" }),
  );
  await copyBraceDependencies(fixtureDirectory);
  await writeBrokenBracePatch(fixtureDirectory);
  const brokenInstall = spawnSync(process.execPath, [hook], {
    cwd: fixtureDirectory,
    encoding: "utf8",
  });
  assert.ifError(brokenInstall.error);
  assert.notEqual(brokenInstall.status, 0);
  assert.match(
    brokenInstall.stdout + brokenInstall.stderr,
    /Failed to apply patch/i,
  );
});

test("install hook rejects an absent depth guard even with no patch files", async (context) => {
  const fixtureDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "braces-guard-"),
  );
  context.after(() =>
    fs.rm(fixtureDirectory, { recursive: true, force: true }),
  );
  await fs.writeFile(
    path.join(fixtureDirectory, "package.json"),
    JSON.stringify({ name: "guard-fixture", version: "1.0.0" }),
  );
  const bracesDirectory = path.join(fixtureDirectory, "node_modules/braces");
  await copyBraceDependencies(fixtureDirectory);
  const parserPath = path.join(bracesDirectory, "lib/parse.js");
  const parserSource = await fs.readFile(parserPath, "utf8");
  await fs.writeFile(
    parserPath,
    parserSource.replaceAll("      assertDepth(stack.length);\n", ""),
  );
  const missingPatch = spawnSync(
    process.execPath,
    [path.join(__dirname, "apply-dependency-patches.cjs")],
    { cwd: fixtureDirectory, encoding: "utf8" },
  );
  assert.ifError(missingPatch.error);
  assert.notEqual(missingPatch.status, 0);
  assert.match(missingPatch.stderr, /Braces security patch was not applied/);
});

test("MCP OAuth credentials cannot be sent to a different issuer", async () => {
  const { fetchToken } = require("@modelcontextprotocol/sdk/client/auth.js");
  let networkCalls = 0;
  const provider = {
    clientInformation: async () => ({
      client_id: "security-test-client",
      client_secret: "non-secret-test-placeholder",
      issuer: "https://trusted.example",
    }),
  };
  await assert.rejects(
    fetchToken(provider, "https://untrusted.example", {
      fetchFn: async () => {
        networkCalls++;
        throw new Error("Credentials must not reach the network");
      },
    }),
    /bound to authorization server/,
  );
  assert.equal(networkCalls, 0);
});

test("patched MCP SDK discovers and calls tools over its real transport", async () => {
  const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
  const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
  const {
    InMemoryTransport,
  } = require("@modelcontextprotocol/sdk/inMemory.js");
  const server = new McpServer({ name: "security-test", version: "1.0.0" });
  const client = new Client({ name: "security-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  server.registerTool("check", {}, async () => ({
    content: [{ type: "text", text: "ready" }],
  }));
  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const catalog = await client.listTools();
    assert.deepEqual(
      catalog.tools.map((tool) => tool.name),
      ["check"],
    );
    const response = await client.callTool({ name: "check", arguments: {} });
    assert.deepEqual(response.content, [{ type: "text", text: "ready" }]);
  } finally {
    await client.close();
    await server.close();
  }
});

test("every installed MCP SDK is patched and Braces has one patched location", () => {
  const entries = Object.entries(lockfile.packages);
  const sdkEntries = entries.filter(([name]) =>
    name.endsWith("node_modules/@modelcontextprotocol/sdk"),
  );
  assert.ok(sdkEntries.length > 0);
  for (const [, manifest] of sdkEntries) {
    assert.ok(gte(manifest.version, "1.31.0"));
  }
  assert.deepEqual(
    entries
      .filter(([name]) => name.endsWith("node_modules/braces"))
      .map(([name]) => name),
    ["node_modules/braces"],
  );
});

test("deep brace and parenthesis patterns are rejected before recursion", async () => {
  const response = await runBoundedWorker(`
    const assert = require('node:assert/strict');
    const { parentPort } = require('node:worker_threads');
    const braces = require('braces');
    for (const [open, close] of [['{', '}'], ['(', ')']]) {
      const pattern = open.repeat(4000) + 'a,b' + close.repeat(4000);
      for (const operation of [braces, braces.parse, braces.compile, braces.expand, braces.stringify]) {
        assert.throws(() => operation(pattern), {
          name: 'SyntaxError', message: /maximum depth/,
        });
      }
    }
    parentPort.postMessage('rejected');
  `);
  assert.equal(response, "rejected");
});

test("AST callers cannot bypass recursion guards", () => {
  let syntaxTree = { type: "text", value: "leaf" };
  for (let depth = 0; depth < 1000; depth++) {
    syntaxTree = { type: "root", nodes: [syntaxTree] };
  }
  for (const operation of [braces.compile, braces.expand, braces.stringify]) {
    assert.throws(() => operation(syntaxTree), {
      name: "SyntaxError",
      message: /maximum depth/,
    });
  }
});

test("ordinary brace expansion and consumer matching keep their semantics", () => {
  assert.deepEqual(braces.expand("src/{web,server}/file.{ts,tsx}"), [
    "src/web/file.ts",
    "src/web/file.tsx",
    "src/server/file.ts",
    "src/server/file.tsx",
  ]);
  assert.deepEqual(braces.expand("file{01..03}.ts"), [
    "file01.ts",
    "file02.ts",
    "file03.ts",
  ]);
  assert.deepEqual(
    micromatch(["a.test.ts", "b.test.tsx", "c.js"], "*.test.{ts,tsx}"),
    ["a.test.ts", "b.test.tsx"],
  );
  const boundaryPattern = "{".repeat(99) + "x" + "}".repeat(99);
  assert.doesNotThrow(() => braces.compile(boundaryPattern));
  assert.throws(
    () => braces.parse("{" + boundaryPattern + "}"),
    /maximum depth/,
  );
  assert.doesNotThrow(() => braces.parse("\\{".repeat(200)));
});

test("SVG rendering uses the patched librsvg and preserves PNG output", async () => {
  // GHSA-wq5f-xc86-pv6w fixes the bundled renderer in sharp 0.35.5.
  assert.ok(gte(sharp.versions.sharp, "0.35.5"));
  assert.ok(gte(sharp.versions.rsvg, "2.63.2"));
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">' +
      '<rect width="1200" height="630" fill="#ff0000"/></svg>',
  );
  const png = await sharp(svg).png().toBuffer();
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 630);
  const pixel = await sharp(png)
    .extract({ left: 0, top: 0, width: 1, height: 1 })
    .removeAlpha()
    .raw()
    .toBuffer();
  assert.deepEqual([...pixel], [255, 0, 0]);
});

function runBoundedWorker(code) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(code, { eval: true });
    let hasResponse = false;
    const deadline = setTimeout(() => {
      void worker.terminate();
      reject(
        new Error("Dependency blocked a worker for more than five seconds"),
      );
    }, 5_000);
    worker.once("message", (response) => {
      hasResponse = true;
      clearTimeout(deadline);
      resolve(response);
    });
    worker.once("error", (error) => {
      clearTimeout(deadline);
      reject(error);
    });
    worker.once("exit", (exitCode) => {
      clearTimeout(deadline);
      if (!hasResponse)
        reject(new Error(`Worker exited without a response (${exitCode})`));
    });
  });
}

async function writeCoverageConfiguration(directory) {
  await fs.writeFile(
    path.join(directory, "base.yml"),
    "include:\n  - src/**/*.ts\nreporter:\n  - text\n",
  );
  await fs.writeFile(
    path.join(directory, ".nycrc.yml"),
    "extends: ./base.yml\nall: true\nexclude:\n  - '**/*.test.ts'\n",
  );
}

test("IPv6 trust ranges cannot accidentally trust every IPv4 client", () => {
  for (const subnet of ["::ffff:10.0.0.0/8", "::/1"]) {
    assert.equal(proxyAddress.compile(subnet)("203.0.113.42", 0), false);
  }
  assert.equal(proxyAddress.compile("10.0.0.0/8")("10.2.3.4", 0), true);
  assert.equal(
    proxyAddress.compile("::ffff:10.0.0.0/104")("10.2.3.4", 0),
    true,
  );
  const request = {
    socket: { remoteAddress: "203.0.113.42" },
    headers: { "x-forwarded-for": "192.0.2.99" },
  };
  assert.equal(
    proxyAddress(request, proxyAddress.compile("::/1")),
    "203.0.113.42",
  );
});

test("large indexed source-map offsets are rejected promptly", async () => {
  await assert.rejects(
    runBoundedWorker(`
    const { parentPort } = require('node:worker_threads');
    const { SourceMapConsumer, SourceNode } = require('source-map-js');
    const consumer = new SourceMapConsumer({
      version: 3,
      sections: [{ offset: { line: 1_000_000_000, column: 0 }, map: {
        version: 3, sources: ['input.js'], names: [], mappings: 'AAAA'
      }}]
    });
    parentPort.postMessage(SourceNode.fromStringWithSourceMap('x();\\n', consumer).toString());
  `),
    /Section offset line must not exceed/,
  );
});

test("ordinary source maps retain code and original source positions", () => {
  const consumer = new SourceMapConsumer({
    version: 3,
    sources: ["input.js"],
    names: [],
    mappings: "AAAA",
    sourcesContent: ["x();\n"],
  });
  const reconstructed = SourceNode.fromStringWithSourceMap("x();\n", consumer);
  assert.equal(reconstructed.toString(), "x();\n");
  assert.equal(
    consumer.originalPositionFor({ line: 1, column: 0 }).source,
    "input.js",
  );
});

test("flat selectors parse promptly and preserve their content", async () => {
  const selector = ".a".repeat(200_000);
  const parsed = await runBoundedWorker(`
    const { parentPort } = require('node:worker_threads');
    const parser = require('postcss-selector-parser');
    parentPort.postMessage(parser().processSync('.a'.repeat(200_000)));
  `);
  assert.equal(parsed, selector);
});

test("coverage YAML configs and inherited lists work without sprintf-js", async () => {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), "flashkarte-nyc-config-"),
  );
  try {
    await writeCoverageConfiguration(directory);
    const configuration = await loadNycConfig({ cwd: directory });
    assert.equal(configuration.all, true);
    assert.deepEqual(configuration.include, ["src/**/*.ts"]);
    assert.deepEqual(configuration.exclude, ["**/*.test.ts"]);
    assert.deepEqual(configuration.reporter, ["text"]);
    const lock = JSON.parse(
      await fs.readFile(
        path.resolve(__dirname, "../../package-lock.json"),
        "utf8",
      ),
    );
    assert.equal(
      Object.keys(lock.packages).some((name) => name.endsWith("/sprintf-js")),
      false,
    );
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
