/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["\\.integration\\.test\\.ts$"],
  moduleNameMapper: {
    // otplib v13's default entry is ESM-only, which Jest's CJS runtime can't
    // parse; point at the CJS build it also ships.
    "^otplib$": "<rootDir>/../../node_modules/otplib/dist/functional.cjs",
  },
  // otplib's crypto deps (@scure/base, @noble/hashes) publish ESM-only JS;
  // let ts-jest compile them to CJS instead of ignoring node_modules.
  // (@otplib is in the list so its *nested* node_modules copies of those
  // packages aren't skipped by the first path segment matching.)
  transformIgnorePatterns: ["node_modules/(?!(@scure|@noble|@otplib)/)"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
    "^.+\\.js$": [
      "ts-jest",
      { tsconfig: { allowJs: true, module: "commonjs" } },
    ],
  },
};
