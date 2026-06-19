import { defineConfig } from "@playwright/test";

const repoRoot = new URL("../..", import.meta.url).pathname;

export default defineConfig({
  testDir: ".",
  testMatch: "smoke.spec.ts",
  use: {
    baseURL: "http://127.0.0.1:5177",
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: "pnpm exec vite --config experiments/wind-turbine/vite.config.ts --host 127.0.0.1",
    cwd: repoRoot,
    url: "http://127.0.0.1:5177",
    reuseExistingServer: true,
  },
});
