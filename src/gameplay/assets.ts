import { GAME_CONFIG } from "./config";
import { clamp, clamp01, moveTowards } from "./math";
import type { AssetCapacities, AssetOutputs, AssetRuntime, GenerationControls, IncomingAttack, PlantOutputState } from "./types";

export function windFactor(speedKmh: number): number {
  const config = GAME_CONFIG.assets.renewable;
  if (speedKmh < config.windCutInKmh || speedKmh > config.windCutOutKmh) {
    return 0;
  }
  if (speedKmh <= config.windFullPowerKmh) {
    return clamp01((speedKmh - config.windCutInKmh) / (config.windFullPowerKmh - config.windCutInKmh));
  }
  return 1;
}

export function updateAssetOutputs(args: {
  capacities: AssetCapacities;
  runtime: AssetRuntime;
  controls: GenerationControls;
  currentDemandMW: number;
  dt: number;
  solarFactor: number;
  windKmh: number;
  rainActive?: boolean;
  incomingAttacks?: IncomingAttack[];
}): { runtime: AssetRuntime; outputs: AssetOutputs } {
  const storageSecondsPerMWh = GAME_CONFIG.assets.waterDam.storageSecondsPerMWh;
  const gridDown = args.runtime.breakerTrippedSeconds > 0;
  const dtStorageUnits = args.dt / storageSecondsPerMWh;
  const nuclearTargetMW = clamp(args.controls.nuclearTargetMW, 0, args.capacities.nuclearCapacityMW);
  const nuclearOutputMW = moveTowards(
    args.runtime.nuclearOutputMW,
    nuclearTargetMW,
    GAME_CONFIG.assets.nuclear.rampMWPerSecond * args.dt,
  );

  const thermalThrottle = clamp01(args.controls.thermalThrottle);
  let thermalHeat = clamp01(
    args.runtime.thermalHeat +
      thermalThrottle * GAME_CONFIG.assets.thermal.heatGainPerSecond * args.dt -
      GAME_CONFIG.assets.thermal.coolingPerSecond * args.dt,
  );
  let thermalOutputMW = args.capacities.thermalCapacityMW * thermalThrottle;
  if (thermalHeat > GAME_CONFIG.assets.thermal.overheatThreshold) {
    thermalOutputMW *= GAME_CONFIG.assets.thermal.outputMultiplierWhenOverheated;
  }

  let effectiveSolarFactor = clamp01(args.solarFactor);
  let effectiveWindKmh = args.windKmh;
  for (const attack of args.incomingAttacks ?? []) {
    if (attack.warningRemainingSeconds <= 0 && attack.activeRemainingSeconds > 0 && attack.kind === "cloudFront") {
      effectiveSolarFactor *= GAME_CONFIG.cards.cloudFront.opponentRenewableSolarFactorMultiplier;
    }
    if (attack.warningRemainingSeconds <= 0 && attack.activeRemainingSeconds > 0 && attack.kind === "windStorm") {
      effectiveWindKmh = GAME_CONFIG.cards.windStorm.opponentWindKmh;
    }
  }

  let solarOutputMW = args.capacities.solarPeakMW * effectiveSolarFactor;
  let windOutputMW = args.controls.windEnabled ? args.capacities.windPeakMW * windFactor(effectiveWindKmh) : 0;
  let gridNuclearOutputMW = nuclearOutputMW;
  let gridThermalOutputMW = thermalOutputMW;
  const plantStates: AssetOutputs["plantStates"] = {
    nuclear: "online",
    thermal: "online",
    solar: "online",
    wind: "online",
    waterDam: "online",
  };
  if (gridDown) {
    for (const key of Object.keys(plantStates) as Array<keyof typeof plantStates>) {
      plantStates[key] = "gridDown" satisfies PlantOutputState;
    }
    gridNuclearOutputMW = 0;
    gridThermalOutputMW = 0;
    solarOutputMW = 0;
    windOutputMW = 0;
  }
  const baseProductionMW = gridNuclearOutputMW + gridThermalOutputMW + solarOutputMW + windOutputMW;

  let storedWaterMWh = args.runtime.storedWaterMWh;
  let damOutputMW = 0;
  let damAbsorbMW = 0;

  if (args.rainActive && !gridDown) {
    storedWaterMWh += GAME_CONFIG.assets.waterDam.rainFillMWhPerSecond * args.dt;
  }

  if (
    !gridDown &&
    args.rainActive &&
    storedWaterMWh >= args.capacities.waterDamCapacityMWh * GAME_CONFIG.assets.waterDam.rainAutoDrainThreshold
  ) {
    damOutputMW = args.capacities.waterDamMaxPowerMW * GAME_CONFIG.assets.waterDam.rainAutoDrainPowerRatio;
  } else if (!gridDown && args.controls.waterDamMode === "fill") {
    const surplusMW = Math.max(0, baseProductionMW - args.currentDemandMW);
    const remainingStorageMWh = Math.max(0, args.capacities.waterDamCapacityMWh - storedWaterMWh);
    const storageLimitedAbsorbMW =
      dtStorageUnits > 0 ? remainingStorageMWh / GAME_CONFIG.assets.waterDam.fillEfficiency / dtStorageUnits : 0;
    damAbsorbMW = Math.min(surplusMW, args.capacities.waterDamMaxPowerMW, storageLimitedAbsorbMW);
    storedWaterMWh += damAbsorbMW * GAME_CONFIG.assets.waterDam.fillEfficiency * dtStorageUnits;
  } else if (!gridDown && args.controls.waterDamMode === "drain" && dtStorageUnits > 0) {
    const storedPowerLimitMW = storedWaterMWh / dtStorageUnits;
    const drainInputMW = Math.min(args.capacities.waterDamMaxPowerMW, storedPowerLimitMW);
    damOutputMW = drainInputMW * GAME_CONFIG.assets.waterDam.drainEfficiency;
    storedWaterMWh -= drainInputMW * dtStorageUnits;
  }

  storedWaterMWh = clamp(storedWaterMWh, 0, args.capacities.waterDamCapacityMWh);
  thermalHeat = clamp01(thermalHeat);

  let rawProductionMW = baseProductionMW + damOutputMW - damAbsorbMW;
  let gridCapacityMW = args.capacities.gridCapacityMW;
  if (gridDown) {
    rawProductionMW = 0;
    gridCapacityMW = 0;
  }

  const deliveredSupplyMW = Math.min(rawProductionMW, gridCapacityMW);
  const runtime = {
    ...args.runtime,
    nuclearOutputMW,
    thermalHeat,
    storedWaterMWh,
  };

  return {
    runtime,
    outputs: {
      nuclearOutputMW: gridNuclearOutputMW,
      thermalOutputMW: gridThermalOutputMW,
      solarOutputMW,
      windOutputMW,
      damOutputMW,
      damAbsorbMW,
      rawProductionMW,
      deliveredSupplyMW,
      thermalHeat,
      storedWaterMWh,
      plantStates,
    },
  };
}
