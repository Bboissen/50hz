import { expect, test } from "@playwright/test";
import sharp from "sharp";

const weatherAssetPaths = [
  "/assets/icons/weather/sun.png",
  "/assets/icons/weather/cloud.png",
  "/assets/icons/weather/rain.png",
  "/assets/icons/weather/wind.png",
  "/assets/icons/weather/snow.png",
];

test("weather icon source assets are served from the live Vite paths", async ({ request }) => {
  for (const path of weatherAssetPaths) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
  }
});

test("renders weather tape with real icons and advances the timeline", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  const root = page.locator("html");
  await expect(canvas).toBeVisible();
  await expect(root).toHaveAttribute("data-experiment-ready", "true");
  await expect(root).toHaveAttribute("data-icon-count", "5");

  const firstPointerX = await root.getAttribute("data-pointer-x");
  const firstTapeOffset = await root.getAttribute("data-tape-offset");
  const firstTileXs = await root.getAttribute("data-tile-xs");
  const firstTileSlots = await root.getAttribute("data-tile-slots");
  const firstSimTime = await root.getAttribute("data-sim-time");
  const firstScreenshot = await canvas.screenshot();
  expect(firstScreenshot.byteLength).toBeGreaterThan(15_000);

  await expect.poll(async () => root.getAttribute("data-seen-weather")).toContain("cloud");
  await expect.poll(async () => root.getAttribute("data-seen-weather")).toContain("rain");
  await expect.poll(async () => root.getAttribute("data-seen-weather")).toContain("snow");
  await expect.poll(async () => root.getAttribute("data-seen-weather")).toContain("sun");
  await expect.poll(async () => root.getAttribute("data-seen-weather")).toContain("wind");

  await expect(root).toHaveAttribute("data-pointer-x", firstPointerX ?? "");
  await expect
    .poll(async () => root.getAttribute("data-tape-offset"), { timeout: 6_000 })
    .not.toBe(firstTapeOffset);
  await expect
    .poll(async () => root.getAttribute("data-tile-xs"), { timeout: 6_000 })
    .not.toBe(firstTileXs);
  await expect
    .poll(async () => root.getAttribute("data-tile-slots"), { timeout: 6_000 })
    .not.toBe(firstTileSlots);
  await expect
    .poll(async () => root.getAttribute("data-sim-time"), { timeout: 6_000 })
    .not.toBe(firstSimTime);

  const secondScreenshot = await canvas.screenshot();
  expect(secondScreenshot.byteLength).toBeGreaterThan(15_000);
  expect(imagesDiffer(firstScreenshot, secondScreenshot)).toBe(true);
  await expectTapeCropToMove(firstScreenshot, secondScreenshot);
});

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

async function expectTapeCropToMove(first: Uint8Array, second: Uint8Array): Promise<void> {
  const firstMeta = await sharp(first).metadata();
  const scaleX = (firstMeta.width ?? 1440) / 1440;
  const scaleY = (firstMeta.height ?? 900) / 900;
  const crop = {
    left: Math.round(120 * scaleX),
    top: Math.round(320 * scaleY),
    width: Math.round(1180 * scaleX),
    height: Math.round(180 * scaleY),
  };
  const [firstPixels, secondPixels] = await Promise.all([
    sharp(first).extract(crop).raw().toBuffer(),
    sharp(second).extract(crop).raw().toBuffer(),
  ]);
  let changed = 0;
  for (let index = 0; index < Math.min(firstPixels.length, secondPixels.length); index += 4) {
    const delta =
      Math.abs(firstPixels[index] - secondPixels[index]) +
      Math.abs(firstPixels[index + 1] - secondPixels[index + 1]) +
      Math.abs(firstPixels[index + 2] - secondPixels[index + 2]);
    if (delta > 16) {
      changed += 1;
    }
  }

  expect(changed / (firstPixels.length / 4)).toBeGreaterThan(0.08);
}
