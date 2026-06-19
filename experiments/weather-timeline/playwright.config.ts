import { defineConfig, devices } from "@playwright/test";

const repoRoot = new URL("../..", import.meta.url).pathname;

export default defineConfig({
  testDir: ".",
  testMatch: "smoke.spec.ts",
  timeout: 30_000,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: "http://127.0.0.1:5188",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium-1440",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: {
    command: "pnpm exec vite --config experiments/weather-timeline/vite.config.ts --host 127.0.0.1 --port 5188",
    cwd: repoRoot,
    url: "http://127.0.0.1:5188",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
