import { defineConfig } from '@playwright/test';

const url = 'http://127.0.0.1:4180';

export default defineConfig({
  testDir: 'apps/web/e2e',
  timeout: 60_000,
  use: { baseURL: url, channel: process.env.PLAYWRIGHT_CHANNEL || undefined, trace: 'retain-on-failure' },
  webServer: { command: 'corepack pnpm serve:e2e', url, timeout: 120_000 },
  workers: 1,
});
