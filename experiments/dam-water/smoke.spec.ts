import { expect, test } from "@playwright/test";

test("renders the dry dam PNG with Pixi-only animated water", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-experiment-ready", "true");

  const initialWater = Number(await page.locator("html").getAttribute("data-water-level"));
  const initialTime = Number(await page.locator("html").getAttribute("data-time-of-day"));
  const firstScreenshot = await canvas.screenshot();

  await page.waitForTimeout(1600);

  const laterWater = Number(await page.locator("html").getAttribute("data-water-level"));
  const laterTime = Number(await page.locator("html").getAttribute("data-time-of-day"));
  const secondScreenshot = await canvas.screenshot();

  expect(firstScreenshot.byteLength).toBeGreaterThan(10_000);
  expect(secondScreenshot.byteLength).toBeGreaterThan(10_000);
  expect(Math.abs(laterWater - initialWater)).toBeGreaterThan(0.01);
  expect(laterTime).toBeGreaterThan(initialTime);
  expect(imagesDiffer(firstScreenshot, secondScreenshot)).toBe(true);

  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  const adjustedWater = Number(await page.locator("html").getAttribute("data-water-level"));
  expect(adjustedWater).toBeLessThan(laterWater);
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
