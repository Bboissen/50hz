import { rm, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
const extraAssetSources = ["/assets/ui/background/menu.png"];
const assetOptions = {
  "/assets/ui/background/menu.png": { quality: 80, alphaQuality: 90 },
};
const howToSourceRoot = join(repoRoot, "How_to_illustrations");
const howToRuntimeRoot = join(runtimeRoot, "how-to");

function runtimePathForSource(sourcePath) {
  return sourcePath.replace(/^\/assets\//, "/assets/runtime/").replace(/\.png$/, ".webp");
}

const sources = new Set();
for (const sourcePath of extraAssetSources) {
  sources.add(sourcePath);
}

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
  const options = assetOptions[sourcePath] ?? { quality: 85, alphaQuality: 90 };
  await sharp(inputPath)
    .webp({ ...options, effort: 6 })
    .toFile(outputPath);

  manifest.push({
    source: sourcePath,
    runtime: runtimePathForSource(sourcePath),
  });
}

const howToManifest = [];
const howToFiles = await readdir(howToSourceRoot, { withFileTypes: true });
for (const entry of howToFiles) {
  if (!entry.isFile() || !entry.name.endsWith(".png")) {
    continue;
  }
  const inputPath = join(howToSourceRoot, entry.name);
  const outputName = entry.name.replace(/\.png$/, ".webp");
  const outputPath = join(howToRuntimeRoot, outputName);

  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(inputPath)
    .webp({ quality: 82, alphaQuality: 90, effort: 6 })
    .toFile(outputPath);

  howToManifest.push({
    source: `/How_to_illustrations/${entry.name}`,
    runtime: `/assets/runtime/how-to/${outputName}`,
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
      howToAssets: howToManifest.sort((a, b) => a.source.localeCompare(b.source)),
    },
    null,
    2,
  )}\n`,
);

console.log(
  `Optimized ${manifest.length} Pixi runtime assets and ${howToManifest.length} how-to assets into ${relative(
    repoRoot,
    runtimeRoot,
  )}`,
);
