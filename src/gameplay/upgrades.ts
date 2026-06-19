import { GAME_CONFIG } from "./config";
import type { AssetCapacities, PlayerState, UpgradeInProgress, UpgradeKind } from "./types";
import { clamp01 } from "./math";
import { plantForUpgrade } from "./plants";

export function upgradeCost(kind: UpgradeKind, timesPurchased: number): number {
  return plantForUpgrade(kind).cost(timesPurchased);
}

export function buyUpgrade(player: PlayerState, kind: UpgradeKind): PlayerState {
  const plant = plantForUpgrade(kind);
  const cost = upgradeCost(kind, player.upgradePurchases[kind]);
  if (!plant.canPurchase(player)) {
    return player;
  }

  const config = GAME_CONFIG.upgrades[kind];
  return {
    ...player,
    cash: player.cash - cost,
    upgradePurchases: {
      ...player.upgradePurchases,
      [kind]: player.upgradePurchases[kind] + 1,
    },
    upgradesInProgress: [...player.upgradesInProgress, { kind, remainingSeconds: config.buildSeconds }],
  };
}

function applyCompletedUpgrade(capacities: AssetCapacities, kind: UpgradeKind): AssetCapacities {
  return plantForUpgrade(kind).apply(capacities);
}

function thermalOutputMW(capacityMW: number, throttle: number, thermalHeat: number): number {
  const overheatedMultiplier =
    thermalHeat > GAME_CONFIG.assets.thermal.overheatThreshold
      ? GAME_CONFIG.assets.thermal.outputMultiplierWhenOverheated
      : 1;
  return capacityMW * clamp01(throttle) * overheatedMultiplier;
}

function throttleForThermalOutput(outputMW: number, capacityMW: number, thermalHeat: number): number {
  const overheatedMultiplier =
    thermalHeat > GAME_CONFIG.assets.thermal.overheatThreshold
      ? GAME_CONFIG.assets.thermal.outputMultiplierWhenOverheated
      : 1;
  return clamp01(outputMW / Math.max(capacityMW * overheatedMultiplier, 1));
}

export function tickUpgrades(player: PlayerState, dt: number): PlayerState {
  let capacities = player.capacities;
  let controls = player.controls;
  const remaining: UpgradeInProgress[] = [];

  for (const upgrade of player.upgradesInProgress) {
    const nextRemainingSeconds = upgrade.remainingSeconds - dt;
    if (nextRemainingSeconds <= 0) {
      const previousThermalOutputMW =
        upgrade.kind === "thermal"
          ? thermalOutputMW(capacities.thermalCapacityMW, controls.thermalThrottle, player.runtime.thermalHeat)
          : 0;
      capacities = applyCompletedUpgrade(capacities, upgrade.kind);
      if (upgrade.kind === "thermal") {
        controls = {
          ...controls,
          thermalThrottle: throttleForThermalOutput(previousThermalOutputMW, capacities.thermalCapacityMW, player.runtime.thermalHeat),
        };
      }
    } else {
      remaining.push({ ...upgrade, remainingSeconds: nextRemainingSeconds });
    }
  }

  return {
    ...player,
    controls,
    capacities,
    upgradesInProgress: remaining,
  };
}
