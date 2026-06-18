import { GAME_CONFIG } from "./config";
import { clamp01 } from "./math";
import type { ActiveContract, AssetCapacities } from "./types";

export function deterministicMaxCapacityMW(capacities: AssetCapacities): number {
  return Math.min(capacities.gridCapacityMW, capacities.nuclearCapacityMW + capacities.thermalCapacityMW);
}

export function totalMaxCapacityMW(capacities: AssetCapacities, currentRenewableOutputMW: number): number {
  return Math.min(
    capacities.gridCapacityMW,
    capacities.nuclearCapacityMW +
      capacities.thermalCapacityMW +
      currentRenewableOutputMW +
      capacities.waterDamMaxPowerMW,
  );
}

export function fixedContractLoadMW(activeContracts: ActiveContract[]): number {
  return activeContracts.reduce((sum, contract) => sum + contract.loadMW, 0);
}

export function currentContractLoadMW(totalDemandMW: number, subscribedLoadShare: number, activeContracts: ActiveContract[]): number {
  return totalDemandMW * subscribedLoadShare + fixedContractLoadMW(activeContracts);
}

export function contractCapacityBasisMW(args: {
  capacities: AssetCapacities;
  activeContracts: ActiveContract[];
  currentRenewableOutputMW: number;
}): number {
  if (args.activeContracts.length > 0) {
    return totalMaxCapacityMW(args.capacities, args.currentRenewableOutputMW);
  }

  return deterministicMaxCapacityMW(args.capacities);
}

export function contractUtilizationEfficiency(utilization: number): number {
  if (utilization <= 0) {
    return 0;
  }

  if (utilization < GAME_CONFIG.efficiency.targetUtilizationMin) {
    return clamp01(0.45 + 0.55 * (utilization / GAME_CONFIG.efficiency.targetUtilizationMin));
  }

  if (utilization <= GAME_CONFIG.efficiency.targetUtilizationMax) {
    return 1;
  }

  if (utilization <= GAME_CONFIG.efficiency.edgeUtilizationMax) {
    return 0.95;
  }

  if (utilization <= GAME_CONFIG.efficiency.overContractedMax) {
    return 0.75;
  }

  return 0.45;
}

export function computeContractEfficiency(args: {
  currentContractLoadMW: number;
  contractCapacityBasisMW: number;
}): number {
  return contractUtilizationEfficiency(args.currentContractLoadMW / Math.max(args.contractCapacityBasisMW, 1));
}
