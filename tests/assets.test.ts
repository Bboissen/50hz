import { describe, expect, it } from "vitest";

import { updateAssetOutputs, windFactor } from "../src/gameplay/assets";
import { GAME_CONFIG } from "../src/gameplay/config";
import { createInitialPlayerState } from "../src/gameplay/playerState";

describe("assets", () => {
  it("ramps nuclear output instead of snapping", () => {
    const player = createInitialPlayerState("player");
    const result = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: { ...player.controls, nuclearTargetMW: 0, thermalThrottle: 0 },
      currentDemandMW: 70,
      dt: 1,
      solarFactor: 0,
      windKmh: 0,
    });

    expect(result.outputs.nuclearOutputMW).toBe(20);
  });

  it("reduces thermal output while overheated", () => {
    const player = createInitialPlayerState("player");
    const result = updateAssetOutputs({
      capacities: player.capacities,
      runtime: { ...player.runtime, thermalHeat: 0.9 },
      controls: { ...player.controls, thermalThrottle: 1 },
      currentDemandMW: 70,
      dt: 0,
      solarFactor: 0,
      windKmh: 0,
    });

    expect(result.outputs.thermalOutputMW).toBeLessThan(player.capacities.thermalCapacityMW);
  });

  it("cuts wind output above cut-out speed", () => {
    expect(windFactor(GAME_CONFIG.assets.renewable.windCutOutKmh + 1)).toBe(0);
  });

  it("clamps stored water while filling and draining", () => {
    const player = createInitialPlayerState("player");
    const filled = updateAssetOutputs({
      capacities: player.capacities,
      runtime: { ...player.runtime, storedWaterMWh: player.capacities.waterDamCapacityMWh },
      controls: { ...player.controls, waterDamMode: "fill" },
      currentDemandMW: 1,
      dt: 60,
      solarFactor: 1,
      windKmh: 35,
    });
    const drained = updateAssetOutputs({
      capacities: player.capacities,
      runtime: { ...player.runtime, storedWaterMWh: 0 },
      controls: { ...player.controls, waterDamMode: "drain" },
      currentDemandMW: 100,
      dt: 60,
      solarFactor: 0,
      windKmh: 0,
    });

    expect(filled.outputs.storedWaterMWh).toBe(player.capacities.waterDamCapacityMWh);
    expect(drained.outputs.storedWaterMWh).toBe(0);
  });

  it("caps delivered supply by grid capacity", () => {
    const player = createInitialPlayerState("player");
    const result = updateAssetOutputs({
      capacities: { ...player.capacities, gridCapacityMW: 10 },
      runtime: player.runtime,
      controls: { ...player.controls, thermalThrottle: 1 },
      currentDemandMW: 100,
      dt: 1,
      solarFactor: 1,
      windKmh: 35,
    });

    expect(result.outputs.deliveredSupplyMW).toBe(10);
  });
});
