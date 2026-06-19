import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { Assets, Texture } from "pixi.js";

import {
  createAssetResolver,
  PIXI_DEFERRED_ASSET_KEYS,
  PIXI_INITIAL_ASSET_KEYS,
  PIXI_ASSET_SOURCES,
  PIXI_RUNTIME_ASSET_RESOLUTIONS,
  PIXI_RUNTIME_ASSET_URLS,
  runtimeAssetPathForSource,
  type PixiAssetKey,
} from "../src/pixi/assets";
import { CONTROL_DESK_ASSET_SOURCES } from "../src/pixi/controlDesk/controlDeskAssets";
import { WEATHER_ICON_ASSET_SOURCES } from "../src/pixi/controlDesk/weatherIconAssets";

function publicPathToRepoPath(publicPath: string): string {
  return join(process.cwd(), publicPath.replace(/^\//, ""));
}

function hasPngSignature(path: string): boolean {
  const signature = readFileSync(path).subarray(0, 8);
  const expected = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  return expected.every((byte, index) => signature[index] === byte);
}

describe("createAssetResolver", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back without crashing when desk assets and fonts are missing", async () => {
    vi.spyOn(Assets, "load").mockRejectedValue(new Error("missing"));

    const resolver = await createAssetResolver();

    expect(resolver.fontFamily).toBe("Courier New, monospace");
    expect(resolver.texture("desk_background")).toBeUndefined();
  });

  it("loads only startup-critical assets before gameplay first render", async () => {
    const loadedSources: string[] = [];
    vi.spyOn(Assets, "load").mockImplementation((async (...args: unknown[]) => {
      const asset = args[0];
      const source =
        typeof asset === "string"
          ? asset
          : !Array.isArray(asset) && typeof asset === "object" && asset !== null && "src" in asset
            ? String((asset as { src: unknown }).src)
            : "";
      loadedSources.push(source);
      return Texture.EMPTY;
    }) as never);

    await createAssetResolver();

    const initialSources = PIXI_INITIAL_ASSET_KEYS.map((key) => PIXI_RUNTIME_ASSET_URLS[key]);
    const deferredSources = PIXI_DEFERRED_ASSET_KEYS.map((key) => PIXI_RUNTIME_ASSET_URLS[key]);
    expect(loadedSources.length).toBe(initialSources.length);
    for (const source of initialSources) {
      expect(loadedSources).toContain(source);
    }
    for (const source of deferredSources) {
      expect(loadedSources).not.toContain(source);
    }
  });

  it("passes downscaled runtime texture resolution metadata to Pixi", async () => {
    const loadedAssets: Array<{ src: string; data?: { resolution?: number; scaleMode?: string } }> = [];
    vi.spyOn(Assets, "load").mockImplementation((async (...args: unknown[]) => {
      const asset = args[0] as { src: string; data?: { resolution?: number; scaleMode?: string } };
      loadedAssets.push(asset);
      return Texture.EMPTY;
    }) as never);

    await createAssetResolver(["city_household_1", "desk_background"]);

    expect(PIXI_RUNTIME_ASSET_RESOLUTIONS.city_household_1).toBeLessThan(1);
    expect(PIXI_RUNTIME_ASSET_RESOLUTIONS.desk_background).toBe(1);
    expect(loadedAssets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          src: PIXI_RUNTIME_ASSET_URLS.city_household_1,
          data: expect.objectContaining({
            resolution: PIXI_RUNTIME_ASSET_RESOLUTIONS.city_household_1,
            scaleMode: "nearest",
          }),
        }),
        expect.objectContaining({
          src: PIXI_RUNTIME_ASSET_URLS.desk_background,
          data: expect.objectContaining({
            resolution: 1,
            scaleMode: "nearest",
          }),
        }),
      ]),
    );
  });

  it("uses the authored clean 1920x1080 PNG as the runtime desk background", () => {
    const runtimePath = publicPathToRepoPath(CONTROL_DESK_ASSET_SOURCES.desk_background);

    expect(CONTROL_DESK_ASSET_SOURCES.desk_background).toBe(
      "/assets/ui/background/empty_background_1920.runtime.png",
    );
    expect(hasPngSignature(runtimePath)).toBe(true);
  });

  it("keeps the PSD-backed background source out of runtime asset resolution", () => {
    expect(existsSync(publicPathToRepoPath("/assets/ui/background/empty_background_1920.png"))).toBe(true);
    expect(Object.values(CONTROL_DESK_ASSET_SOURCES)).not.toContain(
      "/assets/ui/background/empty_background_1920.png",
    );
  });

  it("keeps dev reference imagery out of Pixi runtime asset resolution", () => {
    expect(existsSync(publicPathToRepoPath("/assets/ui/full_clean.png"))).toBe(true);
    expect(Object.values(CONTROL_DESK_ASSET_SOURCES)).not.toContain("/assets/ui/full_clean.png");
    expect(Object.values(PIXI_ASSET_SOURCES)).not.toContain("/assets/ui/full_clean.png");
    expect(Object.values(PIXI_RUNTIME_ASSET_URLS).join("\n")).not.toContain("full_clean");
  });

  it("declares loadable files for all sprite-backed control desk assets", () => {
    const requiredKeys: PixiAssetKey[] = [
      "desk_background",
      "led_empty_10",
      "led_empty_3",
      "led_green",
      "led_orange",
      "led_red",
      "led_blue",
      "upgrade_arrow",
      "gauge_needle",
      "knob",
      "rotary_left",
      "rotary_center",
      "rotary_right",
      ...(Object.keys(WEATHER_ICON_ASSET_SOURCES) as PixiAssetKey[]),
    ];

    for (const key of requiredKeys) {
      const source = PIXI_ASSET_SOURCES[key];
      expect(source, key).toBeDefined();
      expect(existsSync(publicPathToRepoPath(source!)), key).toBe(true);
    }
  });

  it("declares generated runtime files for all Pixi asset sources", () => {
    for (const [key, source] of Object.entries(PIXI_ASSET_SOURCES)) {
      const runtimePath = runtimeAssetPathForSource(source);
      const runtimeUrl = PIXI_RUNTIME_ASSET_URLS[key as PixiAssetKey];

      expect(existsSync(publicPathToRepoPath(runtimePath)), key).toBe(true);
      expect(runtimeUrl, key).toBeDefined();
      expect(runtimeUrl, key).not.toBe(source);
    }
  });

  it("does not map any new desk asset to the old control_desk directory", () => {
    for (const source of Object.values(CONTROL_DESK_ASSET_SOURCES)) {
      expect(source).not.toContain("assets/ui/control_desk");
    }
  });
});
