import { Assets, Texture } from "pixi.js";

import {
  CONTROL_DESK_ASSET_SOURCES,
  type ControlDeskAssetKey,
} from "./controlDesk/controlDeskAssets";
import { WEATHER_ICON_ASSET_SOURCES, type WeatherIconAssetKey } from "./controlDesk/weatherIconAssets";
import {
  CITY_ASSET_SOURCES,
  CITY_INITIAL_ASSET_KEYS,
  CITY_DEFERRED_ASSET_KEYS,
  type CityAssetKey,
} from "./city/cityAssets";

export type PixiAssetKey = CityAssetKey | ControlDeskAssetKey | WeatherIconAssetKey;

export type AssetResolver = {
  texture: (key: PixiAssetKey) => Texture | undefined;
  loadTexture: (key: PixiAssetKey) => Promise<Texture | undefined>;
  preload: (keys: readonly PixiAssetKey[]) => Promise<void>;
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

type RuntimeAssetManifest = {
  assets: Array<{
    source: string;
    runtime: string;
    resolution?: number;
  }>;
};

const PIXI_RUNTIME_MANIFEST_MODULES = import.meta.glob("../../assets/runtime/manifest.json", {
  eager: true,
  import: "default",
}) as Record<string, RuntimeAssetManifest>;

const PIXI_RUNTIME_MANIFEST = PIXI_RUNTIME_MANIFEST_MODULES["../../assets/runtime/manifest.json"];
const PIXI_RUNTIME_MANIFEST_BY_SOURCE = new Map(
  (PIXI_RUNTIME_MANIFEST?.assets ?? []).map((asset) => [asset.source, asset]),
);

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

export const PIXI_RUNTIME_ASSET_RESOLUTIONS: Partial<Record<PixiAssetKey, number>> = Object.fromEntries(
  Object.entries(PIXI_ASSET_SOURCES).map(([key, source]) => [
    key,
    PIXI_RUNTIME_MANIFEST_BY_SOURCE.get(source)?.resolution ?? 1,
  ]),
) as Partial<Record<PixiAssetKey, number>>;

export const PIXI_INITIAL_ASSET_KEYS: readonly PixiAssetKey[] = [
  ...CITY_INITIAL_ASSET_KEYS,
  ...(Object.keys(CONTROL_DESK_ASSET_SOURCES) as ControlDeskAssetKey[]),
  ...(Object.keys(WEATHER_ICON_ASSET_SOURCES) as WeatherIconAssetKey[]),
];

export const PIXI_DEFERRED_ASSET_KEYS: readonly PixiAssetKey[] = [
  ...CITY_DEFERRED_ASSET_KEYS,
];

export async function createAssetResolver(initialKeys: readonly PixiAssetKey[] = PIXI_INITIAL_ASSET_KEYS): Promise<AssetResolver> {
  const textures = new Map<PixiAssetKey, Texture>();
  const loading = new Map<PixiAssetKey, Promise<Texture | undefined>>();

  const loadTexture = async (key: PixiAssetKey): Promise<Texture | undefined> => {
    const existing = textures.get(key);
    if (existing) {
      return existing;
    }
    const currentLoad = loading.get(key);
    if (currentLoad) {
      return currentLoad;
    }
    const src = PIXI_RUNTIME_ASSET_URLS[key];
    if (!src) {
      return undefined;
    }
    const resolution = PIXI_RUNTIME_ASSET_RESOLUTIONS[key] ?? 1;
    const nextLoad = Assets.load<Texture>({ src, data: { scaleMode: "nearest", resolution } })
      .then((texture) => {
        texture.source.scaleMode = "nearest";
        textures.set(key, texture);
        return texture;
      })
      .catch(() => undefined)
      .finally(() => {
        loading.delete(key);
      });
    loading.set(key, nextLoad);
    return nextLoad;
  };

  const preload = async (keys: readonly PixiAssetKey[]): Promise<void> => {
    await Promise.all(keys.map((key) => loadTexture(key)));
  };

  await preload(initialKeys);

  return {
    texture: (key) => textures.get(key),
    loadTexture,
    preload,
    fontFamily: "Courier New, monospace",
  };
}
