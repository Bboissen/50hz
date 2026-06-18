import { expect, test } from "@playwright/test";

function numberFromReadout(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) {
    throw new Error(`Could not parse readout with ${pattern}: ${text}`);
  }
  return Number(match[1]);
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
  await page.getByRole("button", { name: "DEV" }).click();

  const readout = page.locator(".debug-readout");
  await expect(readout).toContainText("generation=");

  const initial = await readout.textContent();
  const initialGeneration = numberFromReadout(initial ?? "", /generation=(\d+\.\d+)/);

  await page.getByLabel("Nuclear target").evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "0";
    range.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Wind OFF" }).click();

  await expect
    .poll(
      async () => numberFromReadout((await readout.textContent()) ?? "", /generation=(\d+\.\d+)/),
      { timeout: 6_000 },
    )
    .toBeLessThan(initialGeneration - 5);

  const lowGeneration = numberFromReadout((await readout.textContent()) ?? "", /generation=(\d+\.\d+)/);

  await page.getByLabel("Thermal throttle").evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "1";
    range.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Wind ON" }).click();

  await expect
    .poll(
      async () => numberFromReadout((await readout.textContent()) ?? "", /generation=(\d+\.\d+)/),
      { timeout: 6_000 },
    )
    .toBeGreaterThan(lowGeneration + 5);

  const beforeFill = numberFromReadout((await readout.textContent()) ?? "", /stored=(\d+\.\d+)/);
  await page.getByLabel("Dam mode").selectOption("fill");

  await expect
    .poll(
      async () => numberFromReadout((await readout.textContent()) ?? "", /stored=(\d+\.\d+)/),
      { timeout: 6_000 },
    )
    .toBeGreaterThan(beforeFill + 0.1);
});
