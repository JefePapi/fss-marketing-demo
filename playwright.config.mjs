// Parity suite config. Local run serves this folder; set BASE_URL to test the live site.
import { defineConfig } from '@playwright/test';

const live = process.env.BASE_URL;
const base = live || 'http://127.0.0.1:4173/';

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.mjs$/,
  timeout: live ? 60_000 : 30_000, // the live site is slower over the network
  retries: live ? 1 : 0,
  workers: live ? 4 : undefined,
  reporter: [['list'], ['json', { outputFile: 'test-results/parity.json' }]],
  use: { baseURL: base, trace: 'retain-on-failure', acceptDownloads: true },
  projects: [
    { name: 'desktop', testIgnore: /firefox\.spec\.mjs$/, use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } } },
    { name: 'phone-390', testIgnore: /firefox\.spec\.mjs$/, use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'firefox-desktop', testMatch: /firefox\.spec\.mjs$/, use: { browserName: 'firefox', viewport: { width: 1280, height: 900 } } },
  ],
  webServer: live ? undefined : {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
