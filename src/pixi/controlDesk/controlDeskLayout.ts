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
  labelPlacement?: "above" | "below";
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
    | "load"
    | "generation"
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
      minValue: -0.15,
      maxValue: 0.15,
      scale: 0.13,
    },
  },
  ledStrips: {
    reactor: horizontalLed(1502, 179, 10),
    boiler: horizontalLed(1693, 178, 10),
    wind: horizontalLed(1502, 288, 10),
    solar: horizontalLed(1695, 289, 10),
    dam: {
      x: 1552,
      y: 481,
      w: 34,
      h: 118,
      cells: 10,
      orientation: "vertical",
      litCell: { w: 13, h: 8, gap: 3 },
    },
  },
  knobs: {
    reactor: { center: { x: 1572, y: 137 }, radius: 54, minAngle: -2.4, maxAngle: 2.4, scale: 0.29 },
    boiler: { center: { x: 1760, y: 136 }, radius: 54, minAngle: -2.4, maxAngle: 2.4, scale: 0.29 },
    windSwitch: { center: { x: 1574, y: 376 }, radius: 60, scale: 0.33, labelY: 336, labelPlacement: "above" },
    dam: { center: { x: 1735, y: 564 }, radius: 68, scale: 0.34, labelY: 501, labelPlacement: "above" },
  },
  forecast: {
    plot: { x: 374, y: 7, w: 496, h: 59 },
    labels: {
      now: { x: 390, y: 68 },
      soon: { x: 560, y: 68 },
      later: { x: 730, y: 68 },
    },
  },
  demandMonitor: { x: 1532, y: 681, w: 270, h: 237 },
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
    cash: { x: 38, y: 18, fontSize: 23, maxWidth: 170 },
    score: { x: 230, y: 18, fontSize: 23, maxWidth: 130 },
    incidents: { x: 922, y: 14, fontSize: 21, maxWidth: 293 },
    city: { x: 1306, y: 23, fontSize: 22, maxWidth: 614 },
    load: { x: 1008, y: 866, fontSize: 23, maxWidth: 525 },
    generation: { x: 645, y: 870, fontSize: 23, maxWidth: 333 },
    reactor: { x: 1496, y: 72, fontSize: 21 },
    boiler: { x: 1688, y: 70, fontSize: 23, maxWidth: 210 },
    wind: { x: 1497, y: 263, fontSize: 19 },
    solar: { x: 1694, y: 262, fontSize: 19 },
    dam: { x: 1580, y: 448, fontSize: 24, maxWidth: 230 },
  },
  hitZones: {
    reactor: { x: 1572, y: 137, r: 58 },
    boiler: { x: 1760, y: 136, r: 58 },
    wind: { x: 1526, y: 338, w: 118, h: 82 },
    damFill: { x: 1644, y: 522, w: 54, h: 90 },
    damHold: { x: 1698, y: 522, w: 54, h: 90 },
    damDrain: { x: 1752, y: 522, w: 54, h: 90 },
  },
};
