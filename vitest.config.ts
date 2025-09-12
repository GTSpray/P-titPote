import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["tests/vitest.setup.ts"],
    reporters: [["verbose", { summary: false }]],
    globalSetup: ["tests/initdb.ts"],
  },
});
