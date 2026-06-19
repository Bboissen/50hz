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
    scale: 0.2205,
    zIndex: 479,
  },
] as const;

export const CITY_SLOT_CONFIGS: readonly CitySlotConfig[] = [
  {
    id: "dam",
    upgradeable: true,
    x: 424,
    y: 514,
    scale: 0.3075,
    zIndex: 495,
    defaultLevel: 1,
  },
  {
    id: "nuclear",
    upgradeable: true,
    x: 900,
    y: 462,
    scale: 0.435,
    zIndex: 453,
    defaultLevel: 1,
  },
  {
    id: "wind",
    upgradeable: true,
    x: 287,
    y: 826,
    scale: 0.375,
    zIndex: 756,
    defaultLevel: 1,
  },
  {
    id: "solar",
    upgradeable: true,
    x: 808,
    y: 758,
    scale: 0.375,
    zIndex: 749,
    defaultLevel: 1,
  },
  {
    id: "thermal",
    upgradeable: true,
    x: 704,
    y: 938,
    scale: 0.386,
    zIndex: 944,
    defaultLevel: 1,
  },
  {
    id: "business",
    upgradeable: true,
    x: 1243,
    y: 442,
    scale: 0.405,
    zIndex: 466,
    defaultLevel: 1,
  },
  {
    id: "household",
    upgradeable: true,
    x: 1228,
    y: 820,
    scale: 0.3825,
    zIndex: 734,
    defaultLevel: 1,
  },
  {
    id: "datacenter",
    upgradeable: true,
    x: 1648,
    y: 703,
    scale: 0.3495,
    zIndex: 723,
    defaultLevel: 1,
  },
] as const;
