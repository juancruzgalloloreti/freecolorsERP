import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 60000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:3002',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node ../../apps/api/dist/main.js',
      port: 3001,
      cwd: '../../apps/api',
      reuseExistingServer: true,
    },
    {
      command: 'npx next dev -p 3002',
      port: 3002,
      cwd: '.',
      reuseExistingServer: true,
    },
  ],
})
