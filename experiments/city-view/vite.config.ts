import { defineConfig } from "vite";

const experimentRoot = new URL(".", import.meta.url).pathname;
const repoRoot = new URL("../..", import.meta.url).pathname;

export default defineConfig({
  root: experimentRoot,
  publicDir: false,
  server: {
    host: "0.0.0.0",
    port: 5178,
    strictPort: true,
    fs: {
      allow: [repoRoot],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

