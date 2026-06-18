import { GAME_CONFIG } from "./config";
import { clamp01 } from "./math";
import type { AssetCapacities, PlantKey, PlantUpgradeState, PlayerState, UpgradeKind } from "./types";

export const PLANT_ORDER: PlantKey[] = ["reactor", "boiler", "renewables", "waterDam"];

function levelFromDelta(current: number, base: number, delta: number): 0 | 1 | 2 | 3 {
  return Math.min(3, 1 + Math.max(0, Math.floor((current - base) / Math.max(delta, 1)))) as 0 | 1 | 2 | 3;
}

export abstract class PlantDefinition {
  public readonly maxPurchases = 2;
  public readonly maxLevel = 3;

  public constructor(
    public readonly key: PlantKey,
    public readonly kind: UpgradeKind,
    public readonly label: string,
    public readonly shortLabel: string,
  ) {}

  public cost(timesPurchased: number): number {
    return GAME_CONFIG.upgrades[this.kind].baseCost * Math.pow(GAME_CONFIG.upgrades.repeatCostMultiplier, timesPurchased);
  }

  public buildSeconds(): number {
    return GAME_CONFIG.upgrades[this.kind].buildSeconds;
  }

  public canPurchase(player: PlayerState): boolean {
    return player.upgradePurchases[this.kind] < this.maxPurchases && player.cash >= this.cost(player.upgradePurchases[this.kind]);
  }

  public stateFor(player: PlayerState): PlantUpgradeState {
    const remainingBuildSeconds = player.upgradesInProgress
      .filter((upgrade) => upgrade.kind === this.kind)
      .reduce((min, upgrade) => Math.min(min, upgrade.remainingSeconds), Number.POSITIVE_INFINITY);
    const isBuilding = Number.isFinite(remainingBuildSeconds);
    const purchasedLevel = Math.min(3, 1 + player.upgradePurchases[this.kind]) as 0 | 1 | 2 | 3;
    const isMaxed = player.upgradePurchases[this.kind] >= this.maxPurchases;
    const upgradeCost = this.cost(player.upgradePurchases[this.kind]);

    return {
      key: this.key,
      kind: this.kind,
      label: this.label,
      shortLabel: this.shortLabel,
      level: this.completedLevel(player.capacities),
      purchasedLevel,
      maxLevel: this.maxLevel,
      upgradeCost,
      canAfford: this.canPurchase(player),
      isMaxed,
      isBuilding,
      buildProgressRatio: isBuilding ? clamp01(1 - remainingBuildSeconds / Math.max(this.buildSeconds(), 1)) : 1,
      remainingBuildSeconds: isBuilding ? remainingBuildSeconds : 0,
      statusText: isBuilding
        ? `BUILD ${Math.ceil(remainingBuildSeconds)}s`
        : isMaxed
          ? "MAX"
          : `€${upgradeCost.toFixed(0)}`,
      capacityLabel: this.capacityLabel(player.capacities),
    };
  }

  public abstract completedLevel(capacities: AssetCapacities): 0 | 1 | 2 | 3;
  public abstract apply(capacities: AssetCapacities): AssetCapacities;
  public abstract capacityLabel(capacities: AssetCapacities): string;
}

class RenewablePlant extends PlantDefinition {
  public constructor() {
    super("renewables", "renewable", "Renewables", "RENEW");
  }

  public completedLevel(capacities: AssetCapacities): 0 | 1 | 2 | 3 {
    const solarLevel = levelFromDelta(
      capacities.solarPeakMW,
      GAME_CONFIG.assets.renewable.solarPeakMW,
      GAME_CONFIG.upgrades.renewable.solarPeakMW,
    );
    const windLevel = levelFromDelta(
      capacities.windPeakMW,
      GAME_CONFIG.assets.renewable.windPeakMW,
      GAME_CONFIG.upgrades.renewable.windPeakMW,
    );
    return Math.min(solarLevel, windLevel) as 0 | 1 | 2 | 3;
  }

  public apply(capacities: AssetCapacities): AssetCapacities {
    return {
      ...capacities,
      solarPeakMW: capacities.solarPeakMW + GAME_CONFIG.upgrades.renewable.solarPeakMW,
      windPeakMW: capacities.windPeakMW + GAME_CONFIG.upgrades.renewable.windPeakMW,
    };
  }

  public capacityLabel(capacities: AssetCapacities): string {
    return `${capacities.solarPeakMW.toFixed(0)}S/${capacities.windPeakMW.toFixed(0)}W MW`;
  }
}

class ThermalPlant extends PlantDefinition {
  public constructor() {
    super("boiler", "thermal", "Boiler", "BOILER");
  }

  public completedLevel(capacities: AssetCapacities): 0 | 1 | 2 | 3 {
    return levelFromDelta(capacities.thermalCapacityMW, GAME_CONFIG.assets.thermal.capacityMW, GAME_CONFIG.upgrades.thermal.capacityMW);
  }

  public apply(capacities: AssetCapacities): AssetCapacities {
    return {
      ...capacities,
      thermalCapacityMW: capacities.thermalCapacityMW + GAME_CONFIG.upgrades.thermal.capacityMW,
    };
  }

  public capacityLabel(capacities: AssetCapacities): string {
    return `${capacities.thermalCapacityMW.toFixed(0)} MW`;
  }
}

class NuclearPlant extends PlantDefinition {
  public constructor() {
    super("reactor", "nuclear", "Reactor", "REACTOR");
  }

  public completedLevel(capacities: AssetCapacities): 0 | 1 | 2 | 3 {
    return levelFromDelta(capacities.nuclearCapacityMW, GAME_CONFIG.assets.nuclear.capacityMW, GAME_CONFIG.upgrades.nuclear.capacityMW);
  }

  public apply(capacities: AssetCapacities): AssetCapacities {
    return {
      ...capacities,
      nuclearCapacityMW: capacities.nuclearCapacityMW + GAME_CONFIG.upgrades.nuclear.capacityMW,
    };
  }

  public capacityLabel(capacities: AssetCapacities): string {
    return `${capacities.nuclearCapacityMW.toFixed(0)} MW`;
  }
}

class WaterDamPlant extends PlantDefinition {
  public constructor() {
    super("waterDam", "waterDam", "Water Dam", "DAM");
  }

  public completedLevel(capacities: AssetCapacities): 0 | 1 | 2 | 3 {
    const storageLevel = levelFromDelta(
      capacities.waterDamCapacityMWh,
      GAME_CONFIG.assets.waterDam.capacityMWh,
      GAME_CONFIG.upgrades.waterDam.capacityMWh,
    );
    const powerLevel = levelFromDelta(
      capacities.waterDamMaxPowerMW,
      GAME_CONFIG.assets.waterDam.maxPowerMW,
      GAME_CONFIG.upgrades.waterDam.maxPowerMW,
    );
    return Math.min(storageLevel, powerLevel) as 0 | 1 | 2 | 3;
  }

  public apply(capacities: AssetCapacities): AssetCapacities {
    return {
      ...capacities,
      waterDamCapacityMWh: capacities.waterDamCapacityMWh + GAME_CONFIG.upgrades.waterDam.capacityMWh,
      waterDamMaxPowerMW: capacities.waterDamMaxPowerMW + GAME_CONFIG.upgrades.waterDam.maxPowerMW,
    };
  }

  public capacityLabel(capacities: AssetCapacities): string {
    return `${capacities.waterDamCapacityMWh.toFixed(0)} MWh/${capacities.waterDamMaxPowerMW.toFixed(0)} MW`;
  }
}

export const PLANT_DEFINITIONS: Record<PlantKey, PlantDefinition> = {
  reactor: new NuclearPlant(),
  boiler: new ThermalPlant(),
  renewables: new RenewablePlant(),
  waterDam: new WaterDamPlant(),
};

export const UPGRADE_KIND_TO_PLANT = PLANT_ORDER.reduce(
  (lookup, key) => ({
    ...lookup,
    [PLANT_DEFINITIONS[key].kind]: key,
  }),
  {} as Record<UpgradeKind, PlantKey>,
);

export function plantForUpgrade(kind: UpgradeKind): PlantDefinition {
  return PLANT_DEFINITIONS[UPGRADE_KIND_TO_PLANT[kind]];
}

export function buildPlantUpgradeStates(player: PlayerState): Record<PlantKey, PlantUpgradeState> {
  return PLANT_ORDER.reduce(
    (states, key) => ({
      ...states,
      [key]: PLANT_DEFINITIONS[key].stateFor(player),
    }),
    {} as Record<PlantKey, PlantUpgradeState>,
  );
}
