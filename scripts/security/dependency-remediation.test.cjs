const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { Worker } = require("node:worker_threads");
const proxyAddress = require("proxy-addr");
const { SourceMapConsumer, SourceNode } = require("source-map-js");
const { loadNycConfig } = require("@istanbuljs/load-nyc-config");
const sharp = require("sharp");
const { gte } = require("semver");

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
