import { GAME_CONFIG } from "./config";
import type { AssetCapacities, PlayerState, UpgradeInProgress, UpgradeKind } from "./types";
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
