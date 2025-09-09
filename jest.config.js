const { createDefaultPreset } = require("ts-jest");
const tsJestTransformCfg = createDefaultPreset().transform;
/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  verbose: true,
  clearMocks: true,
  preset: "ts-jest",
  transform: {
    ...tsJestTransformCfg,
  },
  testRegex: "tests/.*\\.spec\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js"],
  setupFilesAfterEnv: ["jest-extended/all", "<rootDir>tests/jest.setup.ts"],
};
