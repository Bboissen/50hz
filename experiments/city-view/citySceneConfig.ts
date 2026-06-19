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
  x: DESK_VIEWPORT.x - 148,
  y: DESK_VIEWPORT.y - 288,
  scale: 0.86,
};

export const TERRAIN_TILE_CONFIGS = [
  { x: 980, y: 676, scale: 3.15, zIndex: -40 },
] as const;

export const CITY_DECORATION_CONFIGS = [
  {
    id: "openAiSign",
    x: 1659,
    y: 479,
    scale: 0.315,
    zIndex: 479,
  },
] as const;

export const CITY_SLOT_CONFIGS: readonly CitySlotConfig[] = [
  {
    id: "dam",
    upgradeable: true,
    x: 433,
    y: 495,
    scale: 0.205,
    zIndex: 495,
    defaultLevel: 3,
  },
  {
    id: "nuclear",
    upgradeable: true,
    x: 883,
    y: 453,
    scale: 0.29,
    zIndex: 453,
    defaultLevel: 3,
  },
  {
    id: "wind",
    upgradeable: true,
    x: 351,
    y: 756,
    scale: 0.25,
    zIndex: 756,
    defaultLevel: 3,
  },
  {
    id: "solar",
    upgradeable: true,
    x: 725,
    y: 749,
    scale: 0.25,
    zIndex: 749,
    defaultLevel: 3,
  },
  {
    id: "thermal",
    upgradeable: true,
    x: 579,
    y: 944,
    scale: 0.193,
    zIndex: 944,
    defaultLevel: 3,
  },
  {
    id: "business",
    upgradeable: true,
    x: 1271,
    y: 466,
    scale: 0.27,
    zIndex: 466,
    defaultLevel: 3,
  },
  {
    id: "household",
    upgradeable: true,
    x: 1251,
    y: 734,
    scale: 0.255,
    zIndex: 734,
    defaultLevel: 3,
  },
  {
    id: "datacenter",
    upgradeable: true,
    x: 1642,
    y: 723,
    scale: 0.233,
    zIndex: 723,
    defaultLevel: 3,
  },
] as const;
