import type { Texture } from "pixi.js";

import type { WeatherCondition } from "../../gameplay/weather";
import type { AssetResolver } from "../assets";

export type WeatherIconAssetKey = `weather_${WeatherCondition}`;

export type WeatherIconTextures = Record<WeatherCondition, Texture>;

export const WEATHER_ICON_ASSET_SOURCES: Record<WeatherIconAssetKey, string> = {
  weather_sun: "/assets/icons/weather/sun.png",
  weather_cloud: "/assets/icons/weather/cloud.png",
  weather_rain: "/assets/icons/weather/rain.png",
  weather_wind: "/assets/icons/weather/wind.png",
  weather_snow: "/assets/icons/weather/snow.png",
};

export const WEATHER_ICON_CONDITIONS = Object.keys(WEATHER_ICON_ASSET_SOURCES).map((key) =>
  key.replace(/^weather_/, ""),
) as WeatherCondition[];

export function weatherIconTexturesFromResolver(assets: AssetResolver): WeatherIconTextures | undefined {
  const entries = WEATHER_ICON_CONDITIONS.map((condition) => {
    const texture = assets.texture(`weather_${condition}`);
    return texture ? [condition, texture] as const : undefined;
  });
  if (entries.some((entry) => entry === undefined)) {
    return undefined;
  }
  return Object.fromEntries(entries as Array<readonly [WeatherCondition, Texture]>) as WeatherIconTextures;
}
