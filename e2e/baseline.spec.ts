import { expect, test, type Page } from "@playwright/test";

function numberFromReadout(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) {
    throw new Error(`Could not parse readout with ${pattern}: ${text}`);
  }
  return Number(match[1]);
}

async function clickDebugButton(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name }).click({ force: true });
}

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

test("debug controls drive the shared gameplay readout", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await clickDebugButton(page, "DEV");

  const readout = page.locator(".debug-readout");
  await expect(readout).toContainText("supply=");
  await expect(readout).toContainText("deltaMW=");

  const initial = await readout.textContent();
  const initialGeneration = numberFromReadout(initial ?? "", /supply=(\d+\.\d+)/);

  await page.getByLabel("Nuclear target").evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "30";
    range.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect
    .poll(
      async () => numberFromReadout((await readout.textContent()) ?? "", /supply=(\d+\.\d+)/),
      { timeout: 6_000 },
    )
    .toBeLessThan(initialGeneration - 3);

  const lowGeneration = numberFromReadout((await readout.textContent()) ?? "", /supply=(\d+\.\d+)/);

  await page.getByLabel("Thermal throttle").evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "1";
    range.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect
    .poll(
      async () => numberFromReadout((await readout.textContent()) ?? "", /supply=(\d+\.\d+)/),
      { timeout: 6_000 },
    )
    .toBeGreaterThan(lowGeneration + 3);

  await page.getByLabel("Dam mode").selectOption("drain");
  await expect(readout).toContainText("dam=drain");
});

test("forces underload trip and manual reset through visible debug controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await clickDebugButton(page, "DEV");
  const readout = page.locator(".debug-readout");

  await clickDebugButton(page, "Underload scenario");

  await expect
    .poll(async () => (await readout.textContent()) ?? "", { timeout: 15_000 })
    .toContain("resetRequired=true");
  await expect(readout).toContainText("gridDown=true");
  await expect(readout).toContainText("reason=underload");
  await expect(readout).toContainText("breakerStatus=RESET REQUIRED");
  await expect(readout).toContainText("resetCost=35");
  await expect(readout).toContainText("targetShare=0.0% subscribed=0.0%");
  await expect(readout).toContainText("demand=0.0 supply=0.0");
  await expect(readout).toContainText("state=gridDown");
  await expect(readout).toContainText("lastPenalty=cash-25");

  await clickDebugButton(page, "Pause");
  await clickDebugButton(page, "Hold reset 2.1s");

  await expect(readout).toContainText("resetRequired=false");
  await expect(readout).toContainText("gridDown=false");
  await expect(readout).toContainText("breakerStatus=NETWORK RESET COMPLETE");
});

test("forces overload trip through visible debug controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await clickDebugButton(page, "DEV");
  const readout = page.locator(".debug-readout");

  await clickDebugButton(page, "Overload scenario");

  await expect
    .poll(async () => (await readout.textContent()) ?? "", { timeout: 15_000 })
    .toContain("resetRequired=true");
  await expect(readout).toContainText("gridDown=true");
  await expect(readout).toContainText("reason=overload");
  await expect(readout).toContainText("breakerState=awaiting-reset");
});

test("forces instant capacity trip through visible debug controls", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await clickDebugButton(page, "DEV");
  const readout = page.locator(".debug-readout");

  await clickDebugButton(page, "Capacity trip scenario");

  await expect
    .poll(async () => (await readout.textContent()) ?? "", { timeout: 5_000 })
    .toContain("resetRequired=true");
  await expect(readout).toContainText("gridDown=true");
  await expect(readout).toContainText("reason=capacity-overload");
  await expect(readout).toContainText("score-");
});
