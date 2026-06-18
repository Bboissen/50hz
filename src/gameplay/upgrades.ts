import { GAME_CONFIG } from "./config";
import type { AssetCapacities, PlayerState, UpgradeInProgress, UpgradeKind } from "./types";

export function upgradeCost(kind: UpgradeKind, timesPurchased: number): number {
  const config = GAME_CONFIG.upgrades[kind];
  return config.baseCost * Math.pow(GAME_CONFIG.upgrades.repeatCostMultiplier, timesPurchased);
}

export function buyUpgrade(player: PlayerState, kind: UpgradeKind): PlayerState {
  const cost = upgradeCost(kind, player.upgradePurchases[kind]);
  if (player.cash < cost) {
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
  if (kind === "renewable") {
    return {
      ...capacities,
      solarPeakMW: capacities.solarPeakMW + GAME_CONFIG.upgrades.renewable.solarPeakMW,
      windPeakMW: capacities.windPeakMW + GAME_CONFIG.upgrades.renewable.windPeakMW,
    };
  }

  if (kind === "thermal") {
    return {
      ...capacities,
      thermalCapacityMW: capacities.thermalCapacityMW + GAME_CONFIG.upgrades.thermal.capacityMW,
    };
  }

  if (kind === "nuclear") {
    return {
      ...capacities,
      nuclearCapacityMW: capacities.nuclearCapacityMW + GAME_CONFIG.upgrades.nuclear.capacityMW,
    };
  }

  return {
    ...capacities,
    waterDamCapacityMWh: capacities.waterDamCapacityMWh + GAME_CONFIG.upgrades.waterDam.capacityMWh,
    waterDamMaxPowerMW: capacities.waterDamMaxPowerMW + GAME_CONFIG.upgrades.waterDam.maxPowerMW,
  };
}

export function tickUpgrades(player: PlayerState, dt: number): PlayerState {
  let capacities = player.capacities;
  const remaining: UpgradeInProgress[] = [];

  for (const upgrade of player.upgradesInProgress) {
    const nextRemainingSeconds = upgrade.remainingSeconds - dt;
    if (nextRemainingSeconds <= 0) {
      capacities = applyCompletedUpgrade(capacities, upgrade.kind);
    } else {
      remaining.push({ ...upgrade, remainingSeconds: nextRemainingSeconds });
    }
  }

  return {
    ...player,
    capacities,
    upgradesInProgress: remaining,
  };
}
