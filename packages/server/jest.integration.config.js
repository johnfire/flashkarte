const unitConfig = require("./jest.config");

/** @type {import('jest').Config} */
module.exports = {
  ...unitConfig,
  testMatch: ["**/*.integration.test.ts"],
  testPathIgnorePatterns: [],
  maxWorkers: 1,
};
