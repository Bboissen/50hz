import type { PlantKey } from "../../gameplay/types";

export type Point = { x: number; y: number };
export type Rect = Point & { w: number; h: number };
export type CircleLayout = Point & { r: number };

export type NeedleLayout = {
  center: Point;
  minAngle: number;
  maxAngle: number;
  minValue: number;
  maxValue: number;
  scale: number;
};

export type LedStripLayout = Rect & {
  cells: number;
  orientation: "horizontal" | "vertical";
  litCell: { w: number; h: number; gap: number };
};

export type RotaryLayout = {
  center: Point;
  radius: number;
  minAngle: number;
  maxAngle: number;
  scale: number;
};

export type ThreePositionRotaryLayout = {
  center: Point;
  radius: number;
  scale: number;
  labelY?: number;
};

export type TextLayout = Point & {
  fontSize: number;
  align?: "left" | "center" | "right";
  maxWidth?: number;
};

export type UpgradeRowLayout = {
  key: PlantKey;
  label: Point;
  ledStrip: LedStripLayout;
  upgradeArrow: Point & { scale: number };
  price: TextLayout;
  hitZone: Rect;
};

export type ControlDeskLayout = {
  canvas: { width: 1920; height: 1080 };
  backplate: Rect;
  deskTransform: { x: number; y: number; scaleX: number; scaleY: number };
  topStatusBand: Rect;
  gauges: {
    capacity: NeedleLayout;
    supplyDelta: NeedleLayout;
  };
  ledStrips: Record<"reactor" | "boiler" | "wind" | "solar" | "dam", LedStripLayout>;
  knobs: {
    reactor: RotaryLayout;
    boiler: RotaryLayout;
    windSwitch: ThreePositionRotaryLayout;
    dam: ThreePositionRotaryLayout;
  };
  forecast: {
    plot: Rect;
    labels: Record<"now" | "soon" | "later", Point>;
  };
  demandMonitor: Rect;
  upgradeRows: UpgradeRowLayout[];
  text: Record<
    | "cash"
    | "score"
    | "tariff"
    | "rivalTariff"
    | "load"
    | "generation"
    | "breaker"
    | "share"
    | "weather"
    | "incidents"
    | "city"
    | "reactor"
    | "boiler"
    | "wind"
    | "solar"
    | "dam",
    TextLayout
  >;
  hitZones: Record<"reactor" | "boiler" | "wind" | "damFill" | "damHold" | "damDrain", Rect | CircleLayout>;
};

const horizontalLed = (x: number, y: number, cells: number): LedStripLayout => ({
  x,
  y,
  w: cells === 10 ? 150 : 78,
  h: 24,
  cells,
  orientation: "horizontal",
  litCell: cells === 10 ? { w: 10, h: 13, gap: 3 } : { w: 13, h: 13, gap: 4 },
});

export const CONTROL_DESK_LAYOUT: ControlDeskLayout = {
  canvas: { width: 1920, height: 1080 },
  backplate: { x: 0, y: 0, w: 1920, h: 1080 },
  deskTransform: { x: 0, y: 70, scaleX: 1, scaleY: 1010 / 1080 },
  topStatusBand: { x: 24, y: 6, w: 1872, h: 58 },
  gauges: {
    capacity: {
      center: { x: 718, y: 836 },
      minAngle: -1.35,
      maxAngle: 1.05,
      minValue: 0,
      maxValue: 1.15,
      scale: 0.13,
    },
    supplyDelta: {
      center: { x: 1184, y: 836 },
      minAngle: -1.15,
      maxAngle: 1.15,
      minValue: -0.3,
      maxValue: 0.3,
      scale: 0.13,
    },
  },
  ledStrips: {
    reactor: horizontalLed(1502, 178, 10),
    boiler: horizontalLed(1695, 178, 10),
    wind: horizontalLed(1502, 323, 10),
    solar: horizontalLed(1695, 323, 10),
    dam: {
      x: 1556,
      y: 478,
      w: 34,
      h: 118,
      cells: 10,
      orientation: "vertical",
      litCell: { w: 13, h: 8, gap: 3 },
    },
  },
  knobs: {
    reactor: { center: { x: 1570, y: 136 }, radius: 54, minAngle: -2.4, maxAngle: 2.4, scale: 0.29 },
    boiler: { center: { x: 1749, y: 136 }, radius: 54, minAngle: -2.4, maxAngle: 2.4, scale: 0.29 },
    windSwitch: { center: { x: 1560, y: 390 }, radius: 60, scale: 0.33, labelY: 443 },
    dam: { center: { x: 1735, y: 562 }, radius: 68, scale: 0.34, labelY: 626 },
  },
  forecast: {
    plot: { x: 342, y: 10, w: 420, h: 50 },
    labels: {
      now: { x: 356, y: 62 },
      soon: { x: 500, y: 62 },
      later: { x: 644, y: 62 },
    },
  },
  demandMonitor: { x: 1488, y: 660, w: 386, h: 338 },
  upgradeRows: [
    {
      key: "reactor",
      label: { x: 82, y: 714 },
      ledStrip: horizontalLed(250, 716, 3),
      upgradeArrow: { x: 382, y: 716, scale: 0.34 },
      price: { x: 388, y: 710, fontSize: 20, align: "right", maxWidth: 72 },
      hitZone: { x: 52, y: 690, w: 410, h: 58 },
    },
    {
      key: "boiler",
      label: { x: 82, y: 774 },
      ledStrip: horizontalLed(250, 776, 3),
      upgradeArrow: { x: 382, y: 776, scale: 0.34 },
      price: { x: 388, y: 770, fontSize: 20, align: "right", maxWidth: 72 },
      hitZone: { x: 52, y: 750, w: 410, h: 58 },
    },
    {
      key: "renewables",
      label: { x: 82, y: 834 },
      ledStrip: horizontalLed(250, 836, 3),
      upgradeArrow: { x: 382, y: 836, scale: 0.34 },
      price: { x: 388, y: 830, fontSize: 20, align: "right", maxWidth: 72 },
      hitZone: { x: 52, y: 810, w: 410, h: 58 },
    },
    {
      key: "waterDam",
      label: { x: 82, y: 894 },
      ledStrip: horizontalLed(250, 896, 3),
      upgradeArrow: { x: 382, y: 896, scale: 0.34 },
      price: { x: 388, y: 890, fontSize: 20, align: "right", maxWidth: 72 },
      hitZone: { x: 52, y: 870, w: 410, h: 58 },
    },
  ],
  text: {
    cash: { x: 42, y: 14, fontSize: 24, maxWidth: 126 },
    score: { x: 42, y: 42, fontSize: 16, maxWidth: 126 },
    tariff: { x: 172, y: 14, fontSize: 16, maxWidth: 132 },
    rivalTariff: { x: 172, y: 42, fontSize: 16, maxWidth: 132 },
    weather: { x: 778, y: 23, fontSize: 16, maxWidth: 126 },
    incidents: { x: 940, y: 13, fontSize: 17, maxWidth: 240 },
    city: { x: 1218, y: 23, fontSize: 17, maxWidth: 260 },
    load: { x: 540, y: 974, fontSize: 18, maxWidth: 410 },
    generation: { x: 990, y: 974, fontSize: 18, maxWidth: 260 },
    breaker: { x: 990, y: 998, fontSize: 17, maxWidth: 260 },
    share: { x: 1266, y: 998, fontSize: 17, maxWidth: 238 },
    reactor: { x: 1518, y: 72, fontSize: 24, maxWidth: 186 },
    boiler: { x: 1690, y: 72, fontSize: 24, maxWidth: 210 },
    wind: { x: 1530, y: 270, fontSize: 24, maxWidth: 160 },
    solar: { x: 1724, y: 270, fontSize: 24, maxWidth: 160 },
    dam: { x: 1640, y: 470, fontSize: 24, maxWidth: 230 },
  },
  hitZones: {
    reactor: { x: 1570, y: 136, r: 58 },
    boiler: { x: 1749, y: 136, r: 58 },
    wind: { x: 1512, y: 352, w: 118, h: 82 },
    damFill: { x: 1644, y: 520, w: 54, h: 90 },
    damHold: { x: 1698, y: 520, w: 54, h: 90 },
    damDrain: { x: 1752, y: 520, w: 54, h: 90 },
  },
};
