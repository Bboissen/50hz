import { mkdirSync } from "node:fs";

import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";

const proofScreenshotDir = ".artifacts/ui-migration";
const weatherIconPaths = [
  "/assets/runtime/icons/weather/sun.webp",
  "/assets/runtime/icons/weather/moon.webp",
  "/assets/runtime/icons/weather/cloud.webp",
  "/assets/runtime/icons/weather/rain.webp",
  "/assets/runtime/icons/weather/wind.webp",
  "/assets/runtime/icons/weather/snow.webp",
];

async function saveProofScreenshot(page: Page, name: string): Promise<string> {
  mkdirSync(proofScreenshotDir, { recursive: true });
  const path = `${proofScreenshotDir}/${name}`;
  await page.screenshot({
    path,
    fullPage: true,
  });
  return path;
}

async function saveProofScreenshotAndAssertSize(
  page: Page,
  name: string,
  expected: { width: number; height: number },
): Promise<void> {
  const path = await saveProofScreenshot(page, name);
  const metadata = await sharp(path).metadata();
  expect(metadata.width).toBe(expected.width);
  expect(metadata.height).toBe(expected.height);
}

function numberFromReadout(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) {
    throw new Error(`Could not parse readout with ${pattern}: ${text}`);
  }
  return Number(match[1]);
}

async function clickDebugButton(page: Page, name: string): Promise<void> {
  if (name !== "DEV") {
    const debugPanel = page.locator(".debug-panel");
    if ((await debugPanel.count()) > 0) {
      await debugPanel.evaluate((element) => element.classList.remove("is-collapsed"));
    }
    await page.getByRole("button", { name, exact: true }).evaluate((element) => (element as HTMLButtonElement).click());
    return;
  }
  await page.getByRole("button", { name, exact: true }).click({ force: true });
}

async function screenshotPixelStats(buffer: Buffer): Promise<{ nonTransparentPixels: number; distinctSampledColors: number }> {
  const image = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = image.data;
  let nonTransparentPixels = 0;
  const colors = new Set<string>();
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] > 0) {
      nonTransparentPixels += 1;
      if (index % 4012 === 0) {
        colors.add(`${data[index]},${data[index + 1]},${data[index + 2]}`);
      }
    }
  }
  return { nonTransparentPixels, distinctSampledColors: colors.size };
}

async function changedPixelCount(left: Buffer, right: Buffer): Promise<number> {
  const [leftImage, rightImage] = await Promise.all([
    sharp(left).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(right).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  expect(leftImage.info.width).toBe(rightImage.info.width);
  expect(leftImage.info.height).toBe(rightImage.info.height);

  let changedPixels = 0;
  for (let index = 0; index < leftImage.data.length; index += 4) {
    const channelDelta =
      Math.abs(leftImage.data[index] - rightImage.data[index]) +
      Math.abs(leftImage.data[index + 1] - rightImage.data[index + 1]) +
      Math.abs(leftImage.data[index + 2] - rightImage.data[index + 2]) +
      Math.abs(leftImage.data[index + 3] - rightImage.data[index + 3]);
    if (channelDelta > 8) {
      changedPixels += 1;
    }
  }
  return changedPixels;
}

async function canvasPixelStats(page: Page): Promise<{ nonTransparentPixels: number; distinctSampledColors: number }> {
  return screenshotPixelStats(await page.locator("canvas").screenshot());
}

async function pageClip(page: Page, clip: { x: number; y: number; width: number; height: number }): Promise<Buffer> {
  return page.screenshot({ clip });
}

async function startGame(page: Page): Promise<void> {
  const playButton = page.getByRole("button", { name: "Start Game" });
  if (await playButton.isVisible()) {
    await playButton.click();
  }
  await expect(page.locator(".game-menu")).toBeHidden();
}

test("@smoke shows the start menu before the match begins", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "50Hz" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  await expect(page.getByRole("button", { name: "How to Play" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open 50Hz on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/Bboissen/50hz",
  );
  await page.getByRole("button", { name: "How to Play" }).click();
  await expect(page.getByRole("heading", { name: "How to Play" })).toBeVisible();
  await expect(page.getByText("SCREEN 1 / 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Balance the city" })).toBeVisible();
  await expect(page.getByAltText("Two analog gauges showing generation, load, and the power delta")).toBeVisible();
  await expect(page.getByRole("button", { name: "Previous" })).toBeDisabled();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("SCREEN 2 / 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Read what is coming" })).toBeVisible();
  await expect(page.getByAltText("Incident warning for a football final demand spike")).toBeVisible();
  await expect(page.locator(".game-menu__weather-tape-icon")).toHaveCount(6);
  const weatherTutorialIcons = await page.locator(".game-menu__weather-tape-icon").evaluateAll((elements) =>
    elements.map((element) => {
      const image = element as HTMLImageElement;
      return {
        complete: image.complete,
        naturalHeight: image.naturalHeight,
        naturalWidth: image.naturalWidth,
        src: image.currentSrc || image.src,
      };
    }),
  );
  for (const icon of weatherTutorialIcons) {
    expect(icon.complete).toBe(true);
    expect(icon.naturalHeight).toBeGreaterThan(0);
    expect(icon.naturalWidth).toBeGreaterThan(0);
    expect(icon.src).not.toContain("/assets/runtime/icons/weather/");
  }
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("SCREEN 3 / 3")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Survive pressure" })).toBeVisible();
  await expect(page.getByAltText("Business contract offer showing load, reward, strike penalty, accept, and decline")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByRole("heading", { name: "Read what is coming" })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "50Hz" })).toBeVisible();
  await page.getByRole("button", { name: "Start Game" }).click();
  await expect(page.locator(".game-menu")).toBeHidden();
  await expect(page.locator("canvas")).toBeVisible();
});

test("@smoke @startup preloads the runtime behind the menu and falls back to loading on slow start", async ({ page }) => {
  const requestedPaths: string[] = [];
  page.on("request", (request) => {
    requestedPaths.push(new URL(request.url()).pathname);
  });
  await page.route(/\/src\/gameRuntime\.ts(\?.*)?$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });

  await page.goto("/");

  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect.poll(() => requestedPaths.some((path) => path.includes("/src/gameRuntime.ts"))).toBe(true);

  await page.getByRole("button", { name: "Start Game" }).click();

  await expect(page.getByRole("heading", { name: "Loading" })).toBeVisible();
  await expect(page.locator(".game-menu")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(page.locator(".game-menu")).toBeHidden();
  await expect(page.locator("canvas")).toBeVisible();
});

test("@startup renders the first gameplay frame without deferred city level assets", async ({ page }) => {
  const blockedDeferredAssets: string[] = [];
  await page.route(/\/assets\/runtime\/city\/.*level_[23]\.webp$/, (route) => {
    blockedDeferredAssets.push(new URL(route.request().url()).pathname);
    void route.abort();
  });

  await page.goto("/?play=1&seed=deferred-city-proof");

  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const stats = await canvasPixelStats(page);
  expect(stats.nonTransparentPixels).toBeGreaterThan(1920 * 1080 * 0.9);
  expect(stats.distinctSampledColors).toBeGreaterThan(8);
  expect(blockedDeferredAssets.length).toBeGreaterThan(0);
});

test("@gameplay pauses the active game and keeps how to play in the pause overlay", async ({ page }) => {
  await page.goto("/?dev=1&seed=pause-menu-proof");

  await expect(page.locator(".game-menu")).toBeHidden();
  await expect(page.locator(".debug-readout")).toContainText("RUNNING");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await expect(page.locator(".debug-readout")).toContainText("PAUSED");
  await page.getByRole("button", { name: "How to Play" }).click();
  await expect(page.getByRole("heading", { name: "How to Play" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Balance the city" })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator(".game-menu")).toBeHidden();
  await expect(page.locator(".debug-readout")).toContainText("RUNNING");

  await page.keyboard.press("KeyP");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.locator(".game-menu")).toBeHidden();
  await expect(page.locator(".debug-readout")).toContainText("RUNNING");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paused" })).toBeVisible();
  await page.getByRole("button", { name: "Quit" }).click();
  await expect(page.getByRole("heading", { name: "50Hz" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
});

test("@visual city editor adjusts and exports the production city layout", async ({ page }) => {
  await page.goto("/?cityEditor=1");
  const editor = page.locator(".city-editor");

  await expect(editor).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-app-phase", "editing");
  await expect(page.locator(".game-menu")).toBeHidden();
  await expect(editor).toHaveAttribute("data-selected", "terrain");
  const startX = Number(await editor.getAttribute("data-x"));
  const startScale = Number(await editor.getAttribute("data-scale"));

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("KeyE");

  await expect(editor).toHaveAttribute("data-x", String(startX + 1));
  await expect(editor).toHaveAttribute("data-scale", String(startScale + 0.005));
  await expect(editor.locator(".city-editor__export")).toHaveValue(/export const CITY_SLOT_CONFIGS/);

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-app-phase", "editing");
  await expect(editor).toHaveAttribute("data-x", String(startX + 1));

  await page.getByRole("button", { name: "Reset layout" }).click();
  await expect(editor).toHaveAttribute("data-x", String(startX));
});

test("@visual captures the live control desk route through the compatibility ui param", async ({ page }) => {
  test.setTimeout(60_000);

  await page.goto("/?ui=desk");
  await startGame(page);
  const canvas = page.locator("canvas");

  await expect(canvas).toBeVisible();
  await expect(page.locator(".debug-panel")).toHaveCount(0);
  await page.waitForTimeout(250);

  const box = await canvas.boundingBox();
  expect(Math.round(box?.width ?? 0)).toBe(1920);
  expect(Math.round(box?.height ?? 0)).toBe(1080);
  const stats = await canvasPixelStats(page);
  expect(stats.nonTransparentPixels).toBeGreaterThan(1920 * 1080 * 0.9);
  expect(stats.distinctSampledColors).toBeGreaterThan(8);
  const cityViewport = await pageClip(page, { x: 28, y: 28, width: 1429, height: 589 });
  const cityStats = await screenshotPixelStats(cityViewport);
  expect(cityStats.nonTransparentPixels).toBeGreaterThan(1429 * 589 * 0.9);
  expect(cityStats.distinctSampledColors).toBeGreaterThan(40);

  const controlBefore = await pageClip(page, { x: 1640, y: 500, width: 230, height: 170 });
  const forecastBefore = await pageClip(page, { x: 1518, y: 682, width: 304, height: 218 });
  const forecastStats = await screenshotPixelStats(
    forecastBefore,
  );
  expect(forecastStats.distinctSampledColors).toBeGreaterThan(4);
  await page.waitForTimeout(4_000);
  expect(Buffer.compare(forecastBefore, await pageClip(page, { x: 1518, y: 682, width: 304, height: 218 }))).not.toBe(0);
  await page.reload();
  await startGame(page);
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(250);
  const forecastAfterReload = await pageClip(page, { x: 1518, y: 682, width: 304, height: 218 });
  await page.waitForTimeout(4_000);
  expect(Buffer.compare(forecastAfterReload, await pageClip(page, { x: 1518, y: 682, width: 304, height: 218 }))).not.toBe(0);

  await page.keyboard.press("2");
  await page.keyboard.press("Tab");
  await expect(canvas).toBeVisible();

  await saveProofScreenshotAndAssertSize(page, "control-desk-1920x1080.png", { width: 1920, height: 1080 });

  await page.mouse.move(1735, 562);
  await page.mouse.down();
  await page.mouse.move(1800, 562, { steps: 4 });
  await page.mouse.up();
  const controlAfter = await pageClip(page, { x: 1640, y: 500, width: 230, height: 170 });
  expect(Buffer.compare(controlBefore, controlAfter)).not.toBe(0);
  await expect(page.locator(".debug-panel")).toHaveCount(0);
});

test("@smoke serves the weather forecast tape icon assets", async ({ request }) => {
  for (const path of weatherIconPaths) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()["content-type"]).toContain("image/webp");
  }
});

test("@startup keeps the compatibility desk route live when the play flag is present", async ({ page }) => {
  await page.goto("/?ui=desk&play=1");
  const canvas = page.locator("canvas");

  await expect(canvas).toBeVisible();
  await expect(page.locator(".game-menu")).toBeHidden();
  await expect(page.locator(".debug-panel")).toHaveCount(0);
});

test("@visual captures the clean control desk route on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?ui=desk&layoutDebug=1");
  await startGame(page);
  const canvas = page.locator("canvas");

  await expect(canvas).toBeVisible();
  await page.waitForTimeout(250);
  const stats = await canvasPixelStats(page);
  expect(stats.nonTransparentPixels).toBeGreaterThan(40_000);
  expect(stats.distinctSampledColors).toBeGreaterThan(8);

  await saveProofScreenshotAndAssertSize(page, "control-desk-mobile.png", { width: 390, height: 844 });
});

test("@visual captures the live desk route from the play flag", async ({ page }) => {
  await page.goto("/?play=1");
  const canvas = page.locator("canvas");

  await expect(canvas).toBeVisible();
  await expect(page.locator(".debug-panel")).toHaveCount(0);
  await page.waitForTimeout(1_000);

  await page.keyboard.press("2");
  await page.keyboard.press("Tab");

  await saveProofScreenshot(page, "control-desk-live-1920x1080.png");
});

test("@visual completed upgrades change the city plant level in the desk viewport", async ({ page }) => {
  await page.goto("/?dev=1&seed=city-upgrade-proof");
  await startGame(page);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".debug-panel")).toHaveCount(1);
  await page.waitForTimeout(500);

  const rackBefore = await pageClip(page, { x: 88, y: 750, width: 400, height: 58 });
  const cityBefore = await pageClip(page, { x: 28, y: 28, width: 1429, height: 589 });

  await clickDebugButton(page, "DEV");
  await clickDebugButton(page, "Buy thermal");
  await clickDebugButton(page, "DEV");

  await page.waitForTimeout(300);
  const rackBuilding = await pageClip(page, { x: 88, y: 750, width: 400, height: 58 });
  expect(Buffer.compare(rackBefore, rackBuilding)).not.toBe(0);

  await page.waitForTimeout(14_500);
  const cityAfter = await pageClip(page, { x: 28, y: 28, width: 1429, height: 589 });
  expect(Buffer.compare(cityBefore, cityAfter)).not.toBe(0);
});

test("@visual dam drain command changes the water crop in the live city viewport", async ({ page }) => {
  await page.goto("/?dev=1&seed=dam-water-proof");
  await startGame(page);
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(500);

  const damCropBefore = await pageClip(page, { x: 72, y: 34, width: 560, height: 330 });

  await clickDebugButton(page, "DEV");
  await page.getByLabel("Dam mode").selectOption("drain");
  await clickDebugButton(page, "DEV");
  await page.waitForTimeout(1_000);

  const damCropAfter = await pageClip(page, { x: 72, y: 34, width: 560, height: 330 });
  expect(Buffer.compare(damCropBefore, damCropAfter)).not.toBe(0);
});

test("@visual wind turbine crop animates while wind is connected and can be disconnected", async ({ page }) => {
  await page.goto("/?dev=1&seed=wind-crop-proof");
  await startGame(page);
  await expect(page.locator("canvas")).toBeVisible();
  const readout = page.locator(".debug-readout");
  await page.waitForTimeout(1_000);

  const windCropA = await pageClip(page, { x: 36, y: 330, width: 440, height: 220 });
  await page.waitForTimeout(1_000);
  const windCropB = await pageClip(page, { x: 36, y: 330, width: 440, height: 220 });
  expect(await changedPixelCount(windCropA, windCropB)).toBeGreaterThan(1_000);

  await clickDebugButton(page, "DEV");
  await clickDebugButton(page, "Wind OFF");
  await clickDebugButton(page, "DEV");
  await expect(readout).toContainText("wind=OFF");
});

test("@gameplay debug controls drive the shared gameplay readout", async ({ page }) => {
  await page.goto("/?dev=1");
  await startGame(page);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator(".debug-panel")).toHaveCount(1);
  await clickDebugButton(page, "DEV");
  await clickDebugButton(page, "God Mode ON");

  const readout = page.locator(".debug-readout");
  await expect(readout).toContainText("supply=");
  await expect(readout).toContainText("deltaMW=");

  const initial = await readout.textContent();
  const initialGeneration = numberFromReadout(initial ?? "", /supply=(\d+\.\d+)/);

  await page.getByLabel("Nuclear target").evaluate((input) => {
    const range = input as HTMLInputElement;
    range.value = "0";
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

test("@gameplay shows an endgame summary menu and returns to the main menu", async ({ page }) => {
  test.setTimeout(45_000);

  await page.goto("/?dev=1&seed=endgame-menu-proof");
  await startGame(page);
  await expect(page.locator("canvas")).toBeVisible();
  await clickDebugButton(page, "DEV");
  const readout = page.locator(".debug-readout");

  await clickDebugButton(page, "Buy thermal");
  await expect
    .poll(async () => numberFromReadout((await readout.textContent()) ?? "", /cash=(-?\d+\.\d+)/), { timeout: 5_000 })
    .toBeLessThan(60);
  await clickDebugButton(page, "Overload scenario");
  await expect
    .poll(async () => (await readout.textContent()) ?? "", { timeout: 15_000 })
    .toContain("resetRequired=true");
  await clickDebugButton(page, "Hold reset 2.1s");
  await expect
    .poll(async () => (await readout.textContent()) ?? "", { timeout: 5_000 })
    .toContain("gameOver=player-reset-bankrupt");

  await expect(page.getByText("Grid Lost")).toBeVisible();
  await expect(page.getByText("You could not pay the breaker reset.")).toBeVisible();
  await expect(page.getByText("YOU", { exact: true })).toBeVisible();
  await expect(page.getByText("GRID-AI", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Replay" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Main Menu" })).toBeVisible();

  await page.getByRole("button", { name: "Main Menu" }).click();
  await expect(page.getByRole("heading", { name: "50Hz" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start Game" })).toBeVisible();
  await page.getByRole("button", { name: "Start Game" }).click();
  await expect(page.locator(".game-menu")).toBeHidden();
  await expect(readout).toContainText("gameOver=none");
});

test("@gameplay forces underload trip and manual reset through the breaker modal", async ({ page }) => {
  await page.goto("/?dev=1");
  await startGame(page);
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

  await page.mouse.click(812, 450);
  await page.mouse.move(1130, 452);
  await page.mouse.down();
  await page.waitForTimeout(3_500);
  await page.mouse.up();

  await expect.poll(async () => (await readout.textContent()) ?? "", { timeout: 5_000 }).toContain("resetRequired=false");
  await expect(readout).toContainText("gridDown=false");
  await expect(readout).toContainText("breakerState=recovered");
  await expect(readout).toContainText("breakerStatus=NETWORK RESET COMPLETE");
});

test("@gameplay forces overload trip through visible debug controls", async ({ page }) => {
  await page.goto("/?dev=1");
  await startGame(page);
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

test("@gameplay forces a high-risk contract trip through visible debug controls", async ({ page }) => {
  await page.goto("/?dev=1");
  await startGame(page);
  await expect(page.locator("canvas")).toBeVisible();
  await clickDebugButton(page, "DEV");
  const readout = page.locator(".debug-readout");

  await clickDebugButton(page, "Overload scenario");
  await clickDebugButton(page, "Capacity trip scenario");

  await expect
    .poll(async () => (await readout.textContent()) ?? "", { timeout: 5_000 })
    .toContain("resetRequired=true");
  await expect(readout).toContainText("gridDown=true");
  await expect(readout).toContainText("reason=");
  await expect(readout).toContainText("score-");
});
