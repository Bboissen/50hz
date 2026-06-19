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

export async function createAssetResolver(): Promise<AssetResolver> {
  const textures = new Map<PixiAssetKey, Texture>();

  await Promise.all(
    Object.entries(PIXI_ASSET_SOURCES).map(async ([key, src]) => {
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
