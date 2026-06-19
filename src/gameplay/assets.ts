import { GAME_CONFIG } from "./config";
import { clamp, clamp01, moveTowards } from "./math";
import type { AssetCapacities, AssetOutputs, AssetRuntime, GenerationControls, PlantOutputState } from "./types";

export function solarPotentialMW(capacities: AssetCapacities, solarFactor: number): number {
  return capacities.solarPeakMW * clamp01(solarFactor);
}

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

export function windPotentialMW(capacities: AssetCapacities, controls: GenerationControls, windKmh: number): number {
  return controls.windEnabled ? capacities.windPeakMW * windFactor(windKmh) : 0;
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

  const solarPotential = solarPotentialMW(args.capacities, args.solarFactor);
  const windPotential = windPotentialMW(args.capacities, args.controls, args.windKmh);
  const renewableRampSeconds = GAME_CONFIG.assets.renewable.rampSeconds;
  const solarRampMWPerSecond =
    renewableRampSeconds <= 0 ? args.capacities.solarPeakMW : args.capacities.solarPeakMW / renewableRampSeconds;
  const windRampMWPerSecond =
    renewableRampSeconds <= 0 ? args.capacities.windPeakMW : args.capacities.windPeakMW / renewableRampSeconds;
  let solarOutputMW =
    solarPotential < args.runtime.solarOutputMW
      ? solarPotential
      : moveTowards(
          args.runtime.solarOutputMW,
          solarPotential,
          solarRampMWPerSecond * args.dt,
        );
  let windOutputMW = moveTowards(
    args.runtime.windOutputMW,
    windPotential,
    windRampMWPerSecond * args.dt,
  );
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
  let damFlowTargetMW = 0;

  if (args.rainActive && !gridDown) {
    storedWaterMWh += GAME_CONFIG.assets.waterDam.rainFillMWhPerSecond * args.dt;
  }

  if (
    !gridDown &&
    args.rainActive &&
    storedWaterMWh >= args.capacities.waterDamCapacityMWh * GAME_CONFIG.assets.waterDam.rainAutoDrainThreshold
  ) {
    damFlowTargetMW = args.capacities.waterDamMaxPowerMW * GAME_CONFIG.assets.waterDam.rainAutoDrainPowerRatio;
  } else if (!gridDown && args.controls.waterDamMode === "fill") {
    const remainingStorageMWh = Math.max(0, args.capacities.waterDamCapacityMWh - storedWaterMWh);
    const storageLimitedAbsorbMW =
      dtStorageUnits > 0 ? remainingStorageMWh / GAME_CONFIG.assets.waterDam.fillEfficiency / dtStorageUnits : 0;
    damFlowTargetMW = -Math.min(args.capacities.waterDamMaxPowerMW, storageLimitedAbsorbMW);
  } else if (!gridDown && args.controls.waterDamMode === "drain" && dtStorageUnits > 0) {
    const storedPowerLimitMW = storedWaterMWh / dtStorageUnits;
    const drainInputMW = Math.min(args.capacities.waterDamMaxPowerMW, storedPowerLimitMW);
    damFlowTargetMW = drainInputMW * GAME_CONFIG.assets.waterDam.drainEfficiency;
  }

  const previousDamFlowMW = gridDown ? 0 : args.runtime.damOutputMW - args.runtime.damAbsorbMW;
  const damRampMWPerSecond =
    previousDamFlowMW < 0 || damFlowTargetMW < 0
      ? GAME_CONFIG.assets.waterDam.fillRampMWPerSecond
      : GAME_CONFIG.assets.waterDam.drainRampMWPerSecond;
  const rampedDamFlowMW = moveTowards(
    previousDamFlowMW,
    damFlowTargetMW,
    damRampMWPerSecond * args.dt,
  );
  let damOutputMW = 0;
  let damAbsorbMW = 0;
  if (rampedDamFlowMW > 0 && dtStorageUnits > 0) {
    const storedOutputLimitMW = (storedWaterMWh / dtStorageUnits) * GAME_CONFIG.assets.waterDam.drainEfficiency;
    damOutputMW = Math.min(rampedDamFlowMW, storedOutputLimitMW);
    storedWaterMWh -= (damOutputMW / GAME_CONFIG.assets.waterDam.drainEfficiency) * dtStorageUnits;
  } else if (rampedDamFlowMW < 0 && dtStorageUnits > 0) {
    const remainingStorageMWh = Math.max(0, args.capacities.waterDamCapacityMWh - storedWaterMWh);
    const storageLimitedAbsorbMW =
      remainingStorageMWh / GAME_CONFIG.assets.waterDam.fillEfficiency / dtStorageUnits;
    const availableFillPowerMW = Math.max(0, baseProductionMW);
    damAbsorbMW = Math.min(-rampedDamFlowMW, storageLimitedAbsorbMW, availableFillPowerMW);
    storedWaterMWh += damAbsorbMW * GAME_CONFIG.assets.waterDam.fillEfficiency * dtStorageUnits;
  }

  storedWaterMWh = clamp(storedWaterMWh, 0, args.capacities.waterDamCapacityMWh);
  thermalHeat = clamp01(thermalHeat);

  let rawProductionMW = Math.max(0, baseProductionMW + damOutputMW - damAbsorbMW);
  let gridCapacityMW = args.capacities.gridCapacityMW;
  if (gridDown) {
    rawProductionMW = 0;
    gridCapacityMW = 0;
  }

  const deliveredSupplyMW = Math.min(rawProductionMW, gridCapacityMW);
  const runtime = {
    ...args.runtime,
    nuclearOutputMW,
    solarOutputMW,
    windOutputMW,
    damOutputMW,
    damAbsorbMW,
    thermalHeat,
    storedWaterMWh,
  };

  return {
    runtime,
    outputs: {
      nuclearOutputMW: gridNuclearOutputMW,
      thermalOutputMW: gridThermalOutputMW,
      solarPotentialMW: solarPotential,
      solarOutputMW,
      windPotentialMW: windPotential,
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
