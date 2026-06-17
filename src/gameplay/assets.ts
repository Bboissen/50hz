import { GAME_CONFIG } from "./config";
import { clamp, clamp01, moveTowards } from "./math";
import type { AssetCapacities, AssetOutputs, AssetRuntime, GenerationControls, IncomingAttack } from "./types";

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
  const dtHours = args.dt / 3600;
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

  const solarOutputMW = args.capacities.solarPeakMW * effectiveSolarFactor;
  const windOutputMW = args.controls.windEnabled ? args.capacities.windPeakMW * windFactor(effectiveWindKmh) : 0;
  const baseProductionMW = nuclearOutputMW + thermalOutputMW + solarOutputMW + windOutputMW;

  let storedWaterMWh = args.runtime.storedWaterMWh;
  let damOutputMW = 0;
  let damAbsorbMW = 0;

  if (args.rainActive) {
    storedWaterMWh += GAME_CONFIG.assets.waterDam.rainFillMWhPerSecond * args.dt;
  }

  if (
    args.rainActive &&
    storedWaterMWh >= args.capacities.waterDamCapacityMWh * GAME_CONFIG.assets.waterDam.rainAutoDrainThreshold
  ) {
    damOutputMW = args.capacities.waterDamMaxPowerMW;
  } else if (args.controls.waterDamMode === "fill") {
    const surplusMW = Math.max(0, baseProductionMW - args.currentDemandMW);
    damAbsorbMW = Math.min(surplusMW, args.capacities.waterDamMaxPowerMW);
    storedWaterMWh += damAbsorbMW * GAME_CONFIG.assets.waterDam.fillEfficiency * dtHours;
  } else if (args.controls.waterDamMode === "drain" && dtHours > 0) {
    const storedPowerLimitMW = storedWaterMWh / dtHours;
    const drainInputMW = Math.min(args.capacities.waterDamMaxPowerMW, storedPowerLimitMW);
    damOutputMW = drainInputMW * GAME_CONFIG.assets.waterDam.drainEfficiency;
    storedWaterMWh -= drainInputMW * dtHours;
  }

  storedWaterMWh = clamp(storedWaterMWh, 0, args.capacities.waterDamCapacityMWh);
  thermalHeat = clamp01(thermalHeat);

  let rawProductionMW = baseProductionMW + damOutputMW - damAbsorbMW;
  let gridCapacityMW = args.capacities.gridCapacityMW;
  if (args.runtime.breakerTrippedSeconds > 0) {
    rawProductionMW *= 0.85;
    gridCapacityMW *= 0.85;
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
      nuclearOutputMW,
      thermalOutputMW,
      solarOutputMW,
      windOutputMW,
      damOutputMW,
      damAbsorbMW,
      rawProductionMW,
      deliveredSupplyMW,
      thermalHeat,
      storedWaterMWh,
    },
  };
}
