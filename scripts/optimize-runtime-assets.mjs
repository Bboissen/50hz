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
const citySceneConfig = await readFile(join(repoRoot, "src/pixi/city/citySceneConfig.ts"), "utf8");
const worldScale = Number(/WORLD_CAMERA\s*=\s*{[\s\S]*?scale:\s*(?<scale>[0-9.]+)/.exec(citySceneConfig)?.groups?.scale ?? 1);
const slotScales = Object.fromEntries(
  [...citySceneConfig.matchAll(/id:\s*"(?<id>\w+)"[\s\S]*?scale:\s*(?<scale>[0-9.]+)/g)].map((match) => [
    match.groups.id,
    Number(match.groups.scale),
  ]),
);
const openAiSignScale = Number(/id:\s*"openAiSign"[\s\S]*?scale:\s*(?<scale>[0-9.]+)/.exec(citySceneConfig)?.groups?.scale ?? 1);
const cityRuntimePixelDensity = 1.5;
const cityMinScale = 0.35;
const howToSourceRoot = join(repoRoot, "How_to_illustrations");
const howToRuntimeRoot = join(runtimeRoot, "how-to");

function runtimePathForSource(sourcePath) {
  return sourcePath.replace(/^\/assets\//, "/assets/runtime/").replace(/\.png$/, ".webp");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function citySlotIdForSource(sourcePath) {
  if (sourcePath.includes("/buildings/household/")) {
    return "household";
  }
  if (sourcePath.includes("/buildings/business/")) {
    return "business";
  }
  if (sourcePath.includes("/buildings/datacenter/")) {
    return "datacenter";
  }
  for (const slotId of ["nuclear", "thermal", "solar", "wind"]) {
    if (sourcePath.includes(`/power/${slotId}/`) && !sourcePath.includes("/turbine_")) {
      return slotId;
    }
  }
  if (sourcePath.includes("/power/dam/dam_level_")) {
    return "dam";
  }
  return undefined;
}

function runtimePlanForSource(sourcePath, metadata) {
  if (!sourcePath.startsWith("/assets/city/")) {
    return {
      resizeScale: 1,
      options: assetOptions[sourcePath] ?? { quality: 85, alphaQuality: 90 },
    };
  }
  if (sourcePath === "/assets/city/background.png") {
    return {
      resizeScale: 1,
      options: { quality: 78, alphaQuality: 86, smartSubsample: true },
    };
  }

  let resizeScale = 1;
  const slotId = citySlotIdForSource(sourcePath);
  if (slotId) {
    resizeScale = (slotScales[slotId] ?? 1) * worldScale * cityRuntimePixelDensity;
  } else if (sourcePath.includes("/power/dam/")) {
    const targetWidth = 2730 * (slotScales.dam ?? 1) * worldScale * cityRuntimePixelDensity;
    const targetHeight = 1536 * (slotScales.dam ?? 1) * worldScale * cityRuntimePixelDensity;
    resizeScale = Math.max(targetWidth / metadata.width, targetHeight / metadata.height);
  } else if (sourcePath.includes("/power/wind/turbine_")) {
    const maxTurbineMountScale = 0.86;
    resizeScale = (slotScales.wind ?? 1) * worldScale * maxTurbineMountScale * cityRuntimePixelDensity;
  } else if (sourcePath === "/assets/city/openAI.png") {
    resizeScale = openAiSignScale * worldScale * cityRuntimePixelDensity;
  }

  return {
    resizeScale: clamp(resizeScale, cityMinScale, 1),
    options: sourcePath.includes("/mask_") || sourcePath.includes("/upstream_top_mask")
      ? { quality: 70, alphaQuality: 80, smartSubsample: true }
      : { quality: 74, alphaQuality: 82, smartSubsample: true },
  };
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
  const metadata = await sharp(inputPath).metadata();
  const plan = runtimePlanForSource(sourcePath, metadata);
  const runtimeWidth = Math.max(1, Math.round(metadata.width * plan.resizeScale));
  const runtimeHeight = Math.max(1, Math.round(metadata.height * plan.resizeScale));

  await mkdir(dirname(outputPath), { recursive: true });
  await sharp(inputPath)
    .resize({
      width: runtimeWidth,
      height: runtimeHeight,
      fit: "fill",
      kernel: "lanczos3",
    })
    .webp({ ...plan.options, effort: 6 })
    .toFile(outputPath);

  manifest.push({
    source: sourcePath,
    runtime: runtimePathForSource(sourcePath),
    sourceWidth: metadata.width,
    sourceHeight: metadata.height,
    runtimeWidth,
    runtimeHeight,
    resolution: runtimeWidth / metadata.width,
    resizeScale: plan.resizeScale,
    quality: plan.options.quality,
    alphaQuality: plan.options.alphaQuality,
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
