import { expect, test } from "@playwright/test";

const windAssetPaths = [
  "/assets/city/power/wind/wind_level_3.png",
  "/assets/city/power/wind/turbine_1.png",
  "/assets/city/power/wind/turbine_2.png",
  "/assets/city/power/wind/turbine_3.png",
  "/assets/city/power/wind/turbine_4.png",
  "/assets/city/power/wind/turbine_5.png",
  "/assets/city/power/wind/turbine_6.png",
  "/assets/city/power/wind/turbine_7.png",
  "/assets/city/power/wind/turbine_8.png",
];

test("wind experiment source assets are served from the live Vite paths", async ({ request }) => {
  for (const path of windAssetPaths) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
  }
});

test("renders the level 3 wind map with four animated turbine heads", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  const root = page.locator("html");
  await expect(canvas).toBeVisible();
  await expect(root).toHaveAttribute("data-experiment-ready", "true");
  await expect(root).toHaveAttribute("data-animated-turbines", "4");

  const initialFrame = Number(await root.getAttribute("data-frame-index"));
  const initialSpeed = Number(await root.getAttribute("data-speed"));
  const firstScreenshot = await canvas.screenshot();

  await page.waitForTimeout(900);

  const laterFrame = Number(await root.getAttribute("data-frame-index"));
  const secondScreenshot = await canvas.screenshot();

  expect(firstScreenshot.byteLength).toBeGreaterThan(10_000);
  expect(secondScreenshot.byteLength).toBeGreaterThan(10_000);
  expect(laterFrame).not.toBe(initialFrame);
  expect(imagesDiffer(firstScreenshot, secondScreenshot)).toBe(true);

  await page.keyboard.press("Space");
  await expect(root).toHaveAttribute("data-paused", "true");
  const pausedFrame = await root.getAttribute("data-frame-index");
  await page.waitForTimeout(500);
  expect(await root.getAttribute("data-frame-index")).toBe(pausedFrame);

  await page.keyboard.press("ArrowUp");
  expect(Number(await root.getAttribute("data-speed"))).toBeGreaterThan(initialSpeed);

  await page.keyboard.press("KeyI");
  await expect(root).toHaveAttribute("data-smooth", "true");
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
