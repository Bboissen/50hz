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

export type CityViewState = Partial<Record<UpgradeableCitySlotId, CityLevel>>;

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
