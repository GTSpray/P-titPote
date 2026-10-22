import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
  },
  test: {
    globals: true,
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['tests/vitest.setup.ts'],
    env: {
      DOTENV_CONFIG_QUIET: 'true',
      // Fake Discord application id — never use a real APP_ID from .env in tests.
      APP_ID: '1234567890123456789',
    },
    reporters: process.env.GITHUB_ACTIONS
      ? [
          'dot',
          [
            'github-actions',
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
      : [['verbose', { summary: false }]],
    globalSetup: ['tests/vitest.initdb.ts'],
  },
});
