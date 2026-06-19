import type { CitySlotConfig, Rect } from "./cityTypes";

export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

export const DESK_VIEWPORT: Rect = {
  x: 28,
  y: 28,
  w: 1429,
  h: 589,
};

export const WORLD_CAMERA = {
  x: -120,
  y: -260,
  scale: 0.86,
};

export const TERRAIN_TILE_CONFIGS = [
  { x: 980, y: 681, scale: 3.18, zIndex: -10000 },
] as const;

export const CITY_DECORATION_CONFIGS = [
  {
    id: "openAiSign",
    x: 1690,
    y: 418,
    scale: 0.2255,
    zIndex: 360,
  },
] as const;

export const CITY_SLOT_CONFIGS: readonly CitySlotConfig[] = [
  {
    id: "dam",
    upgradeable: true,
    x: 924,
    y: 534,
    scale: 0.2975,
    zIndex: 390,
    defaultLevel: 1,
  },
  {
    id: "nuclear",
    upgradeable: true,
    x: 1380,
    y: 472,
    scale: 0.505,
    zIndex: 378,
    defaultLevel: 1,
  },
  {
    id: "wind",
    upgradeable: true,
    x: 1002,
    y: 846,
    scale: 0.38,
    zIndex: 416,
    defaultLevel: 1,
  },
  {
    id: "solar",
    upgradeable: true,
    x: 459,
    y: 848,
    scale: 0.38,
    zIndex: -299,
    defaultLevel: 1,
  },
  {
    id: "thermal",
    upgradeable: true,
    x: 374,
    y: 616,
    scale: 0.396,
    zIndex: -302,
    defaultLevel: 1,
  },
  {
    id: "business",
    upgradeable: true,
    x: 1623,
    y: 602,
    scale: 0.32,
    zIndex: 1021,
    defaultLevel: 1,
  },
  {
    id: "household",
    upgradeable: true,
    x: 1298,
    y: 700,
    scale: 0.3125,
    zIndex: 1048,
    defaultLevel: 1,
  },
  {
    id: "datacenter",
    upgradeable: true,
    x: 1558,
    y: 873,
    scale: 0.3545,
    zIndex: 1085,
    defaultLevel: 1,
  },
] as const;
