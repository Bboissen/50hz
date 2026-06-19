import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  CITY_DECORATION_CONFIGS,
  CITY_SLOT_CONFIGS,
  DESK_VIEWPORT,
  WORLD_CAMERA,
} from "./citySceneConfig";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const layoutAssetPaths = {
  business: "assets/city/buildings/business/business_level_3.png",
  dam: "assets/city/power/dam/dam_level_3.png",
  datacenter: "assets/city/buildings/datacenter/datacenter_level_3.png",
  household: "assets/city/buildings/household/house_level_3.png",
  nuclear: "assets/city/power/nuclear/nuclear_level_3.png",
  openAiSign: "assets/city/openAI.png",
  solar: "assets/city/power/solar/solar_level_3.png",
  thermal: "assets/city/power/thermal/thermal_level_3.png",
  wind: "assets/city/power/wind/wind_level_3.png",
} as const;

const levelAssetPaths = [
  "assets/city/background.png",
  "assets/city/openAI.png",
  "assets/ui/background/empty_background_1920.runtime.png",
  "assets/city/buildings/household/house_level_1.png",
  "assets/city/buildings/household/house_level_2.png",
  "assets/city/buildings/household/house_level_3.png",
  "assets/city/buildings/business/business_level_1.png",
  "assets/city/buildings/business/business_level_2.png",
  "assets/city/buildings/business/business_level_3.png",
  "assets/city/buildings/datacenter/datacenter_level_1.png",
  "assets/city/buildings/datacenter/datacenter_level_2.png",
  "assets/city/buildings/datacenter/datacenter_level_3.png",
  "assets/city/power/dam/dam_level_1.png",
  "assets/city/power/dam/dam_level_2.png",
  "assets/city/power/dam/dam_level_3.png",
  "assets/city/power/nuclear/nuclear_level_1.png",
  "assets/city/power/nuclear/nuclear_level_2.png",
  "assets/city/power/nuclear/nuclear_level_3.png",
  "assets/city/power/thermal/thermal_level_1.png",
  "assets/city/power/thermal/thermal_level_2.png",
  "assets/city/power/thermal/thermal_level_3.png",
  "assets/city/power/solar/solar_level_1.png",
  "assets/city/power/solar/solar_level_2.png",
  "assets/city/power/solar/solar_level_3.png",
  "assets/city/power/wind/wind_level_1.png",
  "assets/city/power/wind/wind_level_2.png",
  "assets/city/power/wind/wind_level_3.png",
];

test("city view source assets exist at the live repo paths", () => {
  for (const path of levelAssetPaths) {
    expect(existsSync(`${repoRoot}/${path}`), path).toBe(true);
  }
});

test("currently transparent city view sources report alpha", async () => {
  for (const path of levelAssetPaths) {
    const metadata = await sharp(`${repoRoot}/${path}`).metadata();
    expect(metadata.hasAlpha, path).toBe(true);
  }
});

test("deterministic level 3 layout keeps visible tile bounds separate inside the viewport", async () => {
  const boxes = await Promise.all([
    ...CITY_SLOT_CONFIGS.map(async (config) => ({
      id: config.id,
      box: await screenAlphaBox(`${repoRoot}/${layoutAssetPaths[config.id]}`, config),
    })),
    ...CITY_DECORATION_CONFIGS.map(async (config) => ({
      id: config.id,
      box: await screenAlphaBox(`${repoRoot}/${layoutAssetPaths[config.id]}`, config),
    })),
  ]);

  const viewport = {
    bottom: DESK_VIEWPORT.y + DESK_VIEWPORT.h,
    left: DESK_VIEWPORT.x,
    right: DESK_VIEWPORT.x + DESK_VIEWPORT.w,
    top: DESK_VIEWPORT.y,
  };

  for (const { box, id } of boxes) {
    expect(box.left, `${id} left`).toBeGreaterThanOrEqual(viewport.left);
    expect(box.top, `${id} top`).toBeGreaterThanOrEqual(viewport.top);
    expect(box.right, `${id} right`).toBeLessThanOrEqual(viewport.right);
    expect(box.bottom, `${id} bottom`).toBeLessThanOrEqual(viewport.bottom);
  }

  for (let firstIndex = 0; firstIndex < boxes.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < boxes.length; secondIndex += 1) {
      const first = boxes[firstIndex];
      const second = boxes[secondIndex];
      const overlapX = Math.min(first.box.right, second.box.right) - Math.max(first.box.left, second.box.left);
      const overlapY = Math.min(first.box.bottom, second.box.bottom) - Math.max(first.box.top, second.box.top);
      expect(Math.max(0, overlapX) * Math.max(0, overlapY), `${first.id} overlaps ${second.id}`).toBe(0);
    }
  }
});

test("renders a desk-framed modular city and swaps independent slot levels", async ({ page }) => {
  await page.goto("/?household=1&business=2&datacenter=3&nuclear=1&thermal=2&solar=3&wind=1&dam=2");

  const canvas = page.locator("canvas");
  const root = page.locator("html");
  await expect(canvas).toBeVisible();
  await expect(root).toHaveAttribute("data-experiment-ready", "true");
  await expect(root).toHaveAttribute("data-desk-framed", "true");
  await expect(root).toHaveAttribute("data-open-ai-sign", "true");
  await expect(root).toHaveAttribute("data-viewport", "28,28,1429,589");
  await expect(root).toHaveAttribute("data-slot-household-level", "1");
  await expect(root).toHaveAttribute("data-slot-business-level", "2");
  await expect(root).toHaveAttribute("data-slot-datacenter-level", "3");
  await expect(root).toHaveAttribute("data-slot-nuclear-level", "1");
  await expect(root).toHaveAttribute("data-slot-thermal-level", "2");
  await expect(root).toHaveAttribute("data-slot-solar-level", "3");
  await expect(root).toHaveAttribute("data-slot-wind-level", "1");
  await expect(root).toHaveAttribute("data-slot-dam-level", "2");

  const firstScreenshot = await canvas.screenshot();
  expect(firstScreenshot.byteLength).toBeGreaterThan(50_000);
  await expectImageHasVisibleViewportContent(firstScreenshot);

  await page.keyboard.press("KeyH");
  await expect(root).toHaveAttribute("data-selected-slot", "household");
  await page.keyboard.press("Digit3");
  await expect(root).toHaveAttribute("data-slot-household-level", "3");

  const secondScreenshot = await canvas.screenshot();
  expect(imagesDiffer(firstScreenshot, secondScreenshot)).toBe(true);

  await page.keyboard.press("KeyN");
  await expect(root).toHaveAttribute("data-selected-slot", "nuclear");
  await page.keyboard.press("ArrowUp");
  await expect(root).toHaveAttribute("data-slot-nuclear-level", "2");

  await page.keyboard.press("KeyM");
  await expect(root).toHaveAttribute("data-selected-slot", "dam");
  await page.keyboard.press("Digit1");
  await expect(root).toHaveAttribute("data-slot-dam-level", "1");
});

async function expectImageHasVisibleViewportContent(buffer: Uint8Array): Promise<void> {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const scale = Math.min(info.width / 1920, info.height / 1080);
  const offsetX = Math.round((info.width - 1920 * scale) / 2);
  const offsetY = Math.round((info.height - 1080 * scale) / 2);
  const viewportCenter = {
    x: Math.round(offsetX + (28 + 1429 / 2) * scale),
    y: Math.round(offsetY + (28 + 589 / 2) * scale),
  };
  const viewportInteriorSamples = [
    { x: 90, y: 84 },
    { x: 724, y: 322 },
    { x: 1388, y: 560 },
  ].map((point) => ({
    x: Math.round(offsetX + point.x * scale),
    y: Math.round(offsetY + point.y * scale),
  }));
  const samples = [
    rgbaAt(data, info.channels, info.width, viewportCenter.x, viewportCenter.y),
    rgbaAt(data, info.channels, info.width, Math.round(offsetX + 1700 * scale), Math.round(offsetY + 860 * scale)),
  ];

  for (const sample of samples) {
    expect(sample.a).toBeGreaterThan(240);
  }

  const viewportSample = samples[0];
  expect(viewportSample.r + viewportSample.g + viewportSample.b).toBeGreaterThan(120);
  for (const samplePoint of viewportInteriorSamples) {
    const sample = rgbaAt(data, info.channels, info.width, samplePoint.x, samplePoint.y);
    expect(sample.r + sample.g + sample.b).toBeGreaterThan(90);
  }
  expect(uniqueColorCount(buffer)).resolves.toBeGreaterThan(600);
}

async function uniqueColorCount(buffer: Uint8Array): Promise<number> {
  const { data, info } = await sharp(buffer)
    .resize(160, 90, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const colors = new Set<string>();
  for (let index = 0; index < info.width * info.height; index += 1) {
    const offset = index * info.channels;
    colors.add(`${data[offset]},${data[offset + 1]},${data[offset + 2]},${data[offset + 3]}`);
  }
  return colors.size;
}

function rgbaAt(
  data: Uint8Array,
  channels: number,
  width: number,
  x: number,
  y: number,
): { r: number; g: number; b: number; a: number } {
  const offset = (y * width + x) * channels;
  return {
    r: data[offset],
    g: data[offset + 1],
    b: data[offset + 2],
    a: data[offset + 3],
  };
}

async function screenAlphaBox(
  path: string,
  config: { x: number; y: number; scale: number },
): Promise<{ bottom: number; left: number; right: number; top: number }> {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const scale = config.scale * WORLD_CAMERA.scale;
  const centerX = WORLD_CAMERA.x + config.x * WORLD_CAMERA.scale;
  const centerY = WORLD_CAMERA.y + config.y * WORLD_CAMERA.scale;

  return {
    bottom: centerY + (maxY - info.height / 2) * scale,
    left: centerX + (minX - info.width / 2) * scale,
    right: centerX + (maxX - info.width / 2) * scale,
    top: centerY + (minY - info.height / 2) * scale,
  };
}

function imagesDiffer(first: Uint8Array, second: Uint8Array): boolean {
  if (first.byteLength !== second.byteLength) {
    return true;
  }

  for (let index = 0; index < first.byteLength; index += 1) {
    if (first[index] !== second[index]) {
      return true;
    }
  }

  return false;
}
