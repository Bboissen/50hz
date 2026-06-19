import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";
import { Assets } from "pixi.js";

import {
  createAssetResolver,
  PIXI_ASSET_SOURCES,
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
