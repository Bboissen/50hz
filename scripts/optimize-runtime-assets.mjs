import { rm, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

import sharp from "sharp";

const repoRoot = new URL("..", import.meta.url).pathname;
const assetSourceFiles = [
  "src/pixi/city/cityAssets.ts",
  "src/pixi/controlDesk/controlDeskAssets.ts",
  "src/pixi/controlDesk/weatherIconAssets.ts",
];
const runtimeRoot = join(repoRoot, "assets/runtime");
const assetPathPattern = /"(?<path>\/assets\/[^"]+\.png)"/g;

function runtimePathForSource(sourcePath) {
  return sourcePath.replace(/^\/assets\//, "/assets/runtime/").replace(/\.png$/, ".webp");
}

const sources = new Set();
for (const sourceFile of assetSourceFiles) {
  const content = await readFile(join(repoRoot, sourceFile), "utf8");
  for (const match of content.matchAll(assetPathPattern)) {
    sources.add(match.groups.path);
  }
}

await rm(runtimeRoot, { force: true, recursive: true });

const manifest = [];
for (const sourcePath of [...sources].sort()) {
  const inputPath = join(repoRoot, sourcePath.slice(1));
  const outputPath = join(repoRoot, runtimePathForSource(sourcePath).slice(1));

  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(inputPath)
    .webp({ quality: 85, alphaQuality: 90, effort: 6 })
    .toFile(outputPath);

  manifest.push({
    source: sourcePath,
    runtime: runtimePathForSource(sourcePath),
  });
}

await writeFile(
  join(runtimeRoot, "manifest.json"),
  `${JSON.stringify(
    {
      format: "webp",
      quality: 85,
      alphaQuality: 90,
      assets: manifest,
    },
    null,
    2,
  )}\n`,
);

console.log(`Optimized ${manifest.length} Pixi runtime assets into ${relative(repoRoot, runtimeRoot)}`);
