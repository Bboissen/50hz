import { describe, expect, it } from "vitest";

import { GAME_CONFIG } from "../src/gameplay/config";
import { plantForUpgrade } from "../src/gameplay/plants";
import { createInitialPlayerState } from "../src/gameplay/playerState";
import { buyUpgrade, tickUpgrades } from "../src/gameplay/upgrades";
import type { PlayerState, UpgradeKind } from "../src/gameplay/types";

function wealthyPlayer(): PlayerState {
  return {
    ...createInitialPlayerState("player"),
    cash: 1_000,
  };
}

function finishUpgrade(player: PlayerState, kind: UpgradeKind): PlayerState {
  return tickUpgrades(buyUpgrade(player, kind), GAME_CONFIG.upgrades[kind].buildSeconds + 0.1);
}

describe("plant upgrades", () => {
  it("maps completed plant levels to exact MW and MWh values", () => {
    let player = wealthyPlayer();

    player = finishUpgrade(player, "nuclear");
    expect(player.capacities.nuclearCapacityMW).toBe(70);
    player = finishUpgrade(player, "nuclear");
    expect(player.capacities.nuclearCapacityMW).toBe(105);

    player = finishUpgrade(player, "thermal");
    expect(player.capacities.thermalCapacityMW).toBe(70);
    player = finishUpgrade(player, "thermal");
    expect(player.capacities.thermalCapacityMW).toBe(95);

    player = finishUpgrade(player, "renewable");
    expect(player.capacities.solarPeakMW + player.capacities.windPeakMW).toBe(40);
    expect(player.capacities.windPeakMW).toBeCloseTo(24);
    player = finishUpgrade(player, "renewable");
    expect(player.capacities.solarPeakMW + player.capacities.windPeakMW).toBe(55);
    expect(player.capacities.windPeakMW).toBeCloseTo(33);

    player = finishUpgrade(player, "waterDam");
    expect(player.capacities.waterDamCapacityMWh).toBe(35);
    expect(player.capacities.waterDamMaxPowerMW).toBe(25);
    player = finishUpgrade(player, "waterDam");
    expect(player.capacities.waterDamCapacityMWh).toBe(50);
    expect(player.capacities.waterDamMaxPowerMW).toBe(35);
  });

  it("does not exceed level 3", () => {
    let player = wealthyPlayer();
    player = finishUpgrade(player, "thermal");
    player = finishUpgrade(player, "thermal");

    const blocked = buyUpgrade(player, "thermal");
    const plant = plantForUpgrade("thermal");

    expect(blocked).toBe(player);
    expect(plant.completedLevel(player.capacities)).toBe(3);
    expect(player.capacities.thermalCapacityMW).toBe(GAME_CONFIG.assets.plantLevels.thermalMW[2]);
  });

  it("preserves boiler MW output when a thermal upgrade completes", () => {
    const player: PlayerState = {
      ...wealthyPlayer(),
      controls: {
        ...wealthyPlayer().controls,
        thermalThrottle: 1,
      },
    };
    const upgraded = tickUpgrades(buyUpgrade(player, "thermal"), GAME_CONFIG.upgrades.thermal.buildSeconds + 0.1);

    expect(upgraded.capacities.thermalCapacityMW).toBe(GAME_CONFIG.assets.plantLevels.thermalMW[1]);
    expect(upgraded.controls.thermalThrottle).toBeCloseTo(45 / 70);
  });
});
