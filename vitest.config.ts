import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["tests/vitest.setup.ts"],
    reporters: process.env.GITHUB_ACTIONS
      ? [
          "dot",
          [
            "github-actions",
            {
              onWritePath(path: string) {
                return path.replace(
                  /^\/app\//,
                  `${process.env.GITHUB_WORKSPACE}/`,
                );
              },
            },
          ],
        ]
      : [["verbose", { summary: false }]],
    globalSetup: ["tests/vitest.initdb.ts"],
  },
});
