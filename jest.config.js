const { createDefaultPreset } = require("ts-jest");
const tsJestTransformCfg = createDefaultPreset().transform;
/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  verbose: true,
  clearMocks: true,
  transform: {
    ...tsJestTransformCfg,
  },
  setupFilesAfterEnv: ["<rootDir>tests/jest.setup.ts"],
};
