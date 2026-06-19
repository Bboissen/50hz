import type { ProductionConsoleState, SectorVisualState } from "../../gameplay/types";
import type { WindFarmVisualState } from "./AnimatedTurbineField";
import type { DamWaterVisualState } from "./DamWaterObject";
import type { CityLevel, CitySectorOverlayState, CityViewState } from "./cityTypes";

export function cityViewStateFromProductionState(state: ProductionConsoleState): CityViewState {
  return {
    brownout:
      state.sectors.homes.demandLevel === 0 ||
      state.sectors.services.demandLevel === 0 ||
      state.sectors.dataCenters.demandLevel === 0,
    levels: {
      household: clampLevel(state.sectors.homes.demandLevel),
      business: clampLevel(state.sectors.services.demandLevel),
      datacenter: clampLevel(state.sectors.dataCenters.demandLevel),
      nuclear: clampLevel(state.plants.reactor.level),
      thermal: clampLevel(state.plants.boiler.level),
      solar: clampLevel(state.plants.renewables.level),
      wind: clampLevel(state.plants.renewables.level),
      dam: clampLevel(state.plants.waterDam.level),
    },
    sectorOverlays: {
      household: sectorOverlayFromGameplay(state.sectors.homes),
      business: sectorOverlayFromGameplay(state.sectors.services),
      datacenter: sectorOverlayFromGameplay(state.sectors.dataCenters),
    },
  };
}

export function selectDamWaterVisualState(state: ProductionConsoleState): DamWaterVisualState {
  return {
    levelRatio: clamp01(state.storedWaterMWh / Math.max(state.waterDamCapacityMWh, 1)),
    outputRatio: clamp01(state.damOutputMW / Math.max(state.waterDamMaxPowerMW, 1)),
    absorbRatio: clamp01(state.damAbsorbMW / Math.max(state.waterDamMaxPowerMW, 1)),
    rainActive: state.rainActive,
    isGridDown: state.isGridDown,
    timeOfDayRatio: state.timeOfDayRatio,
  };
}

export function selectWindFarmVisualState(state: ProductionConsoleState): WindFarmVisualState {
  return {
    renewableLevel: clampLevel(state.plants.renewables.level),
    windOutputMW: state.windOutputMW,
    windPotentialMW: state.windPotentialMW,
    windPeakMW: state.windPeakMW,
    windEnabled: state.windEnabled,
    windPlantOnline: state.plantStates.wind === "online",
    currentWindKmh: state.currentWindKmh,
  };
}

function clampLevel(level: number): CityLevel {
  if (level <= 1) {
    return 1;
  }
  if (level >= 3) {
    return 3;
  }
  return 2;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sectorOverlayFromGameplay(sector: SectorVisualState): CitySectorOverlayState {
  return {
    isSpiking: sector.isSpiking,
    isDemandCritical: sector.isDemandCritical,
    isBrownedOut: sector.isBrownedOut || sector.demandLevel === 0,
    activeEventId: sector.activeEventId,
  };
}
