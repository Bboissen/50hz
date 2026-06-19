export type CityLevel = 1 | 2 | 3;

export type UpgradeableCitySlotId =
  | "household"
  | "business"
  | "datacenter"
  | "nuclear"
  | "thermal"
  | "solar"
  | "wind"
  | "dam";

export type CitySlotId = UpgradeableCitySlotId;
export type CitySectorSlotId = "household" | "business" | "datacenter";

export type CityViewLevels = Record<UpgradeableCitySlotId, CityLevel>;

export type CitySectorOverlayState = {
  isSpiking: boolean;
  isDemandCritical: boolean;
  isBrownedOut: boolean;
  activeEventId?: string;
};

export type CityViewState = {
  levels: CityViewLevels;
  brownout: boolean;
  sectorOverlays: Record<CitySectorSlotId, CitySectorOverlayState>;
};

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CitySlotConfig = {
  id: CitySlotId;
  upgradeable: boolean;
  x: number;
  y: number;
  scale: number;
  zIndex: number;
  defaultLevel: CityLevel;
};
