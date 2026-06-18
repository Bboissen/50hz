import { expect, test } from "@playwright/test";

test("captures the game screens", async ({ page }, testInfo) => {
  await page.goto("/");
  const canvas = page.locator("canvas");

  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1_000);

  await page.screenshot({
    path: testInfo.outputPath("dispatch-1920x1080.png"),
    fullPage: true,
  });

  await page.keyboard.press("2");
  await page.waitForTimeout(400);

  await page.screenshot({
    path: testInfo.outputPath("production-1920x1080.png"),
    fullPage: true,
  });
});
