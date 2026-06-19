import { Assets, Texture } from "pixi.js";

import {
  CONTROL_DESK_ASSET_SOURCES,
  type ControlDeskAssetKey,
} from "./controlDesk/controlDeskAssets";
import { WEATHER_ICON_ASSET_SOURCES, type WeatherIconAssetKey } from "./controlDesk/weatherIconAssets";
import { CITY_ASSET_SOURCES, type CityAssetKey } from "./city/cityAssets";

export type PixiAssetKey = CityAssetKey | ControlDeskAssetKey | WeatherIconAssetKey;

export type AssetResolver = {
  texture: (key: PixiAssetKey) => Texture | undefined;
  fontFamily: string;
};

export const PIXI_ASSET_SOURCES: Partial<Record<PixiAssetKey, string>> = {
  ...CITY_ASSET_SOURCES,
  ...CONTROL_DESK_ASSET_SOURCES,
  ...WEATHER_ICON_ASSET_SOURCES,
};

const PIXI_RUNTIME_ASSET_MODULES = import.meta.glob("../../assets/runtime/**/*.webp", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

export function runtimeAssetPathForSource(source: string): string {
  return source.replace(/^\/assets\//, "/assets/runtime/").replace(/\.png$/, ".webp");
}

function runtimeAssetGlobKey(source: string): string {
  const runtimePath = runtimeAssetPathForSource(source);
  return `../..${runtimePath}`;
}

export const PIXI_RUNTIME_ASSET_URLS: Partial<Record<PixiAssetKey, string>> = Object.fromEntries(
  Object.entries(PIXI_ASSET_SOURCES).map(([key, source]) => [
    key,
    PIXI_RUNTIME_ASSET_MODULES[runtimeAssetGlobKey(source)] ?? source,
  ]),
) as Partial<Record<PixiAssetKey, string>>;

export async function createAssetResolver(): Promise<AssetResolver> {
  const textures = new Map<PixiAssetKey, Texture>();

  await Promise.all(
    Object.entries(PIXI_RUNTIME_ASSET_URLS).map(async ([key, src]) => {
      try {
        const texture = await Assets.load<Texture>({ src, data: { scaleMode: "nearest" } });
        texture.source.scaleMode = "nearest";
        textures.set(key as PixiAssetKey, texture);
      } catch {
        // Missing authored assets are expected during prototype work.
      }
    }),
  );

  return {
    texture: (key) => textures.get(key),
    fontFamily: "Courier New, monospace",
  };
}
