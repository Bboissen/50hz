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

  it("ramps renewable output toward weather potential instead of snapping", () => {
    const player = createInitialPlayerState("player");
    const result = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: player.controls,
      currentDemandMW: 70,
      dt: 1,
      solarFactor: 1,
      windKmh: GAME_CONFIG.assets.renewable.windFullPowerKmh,
    });

    expect(result.outputs.solarOutputMW).toBe(GAME_CONFIG.assets.renewable.rampMWPerSecond);
    expect(result.outputs.windOutputMW).toBe(GAME_CONFIG.assets.renewable.rampMWPerSecond);
    expect(result.outputs.solarOutputMW).toBeLessThan(player.capacities.solarPeakMW);
    expect(result.outputs.windOutputMW).toBeLessThan(player.capacities.windPeakMW);
  });

  it("ramps renewable output down after weather or routing loss", () => {
    const player = createInitialPlayerState("player");
    const result = updateAssetOutputs({
      capacities: player.capacities,
      runtime: {
        ...player.runtime,
        solarOutputMW: player.capacities.solarPeakMW,
        windOutputMW: player.capacities.windPeakMW,
      },
      controls: { ...player.controls, windEnabled: false },
      currentDemandMW: 70,
      dt: 1,
      solarFactor: 0,
      windKmh: GAME_CONFIG.assets.renewable.windFullPowerKmh,
    });

    expect(result.outputs.solarOutputMW).toBe(player.capacities.solarPeakMW - GAME_CONFIG.assets.renewable.rampMWPerSecond);
    expect(result.outputs.windOutputMW).toBe(player.capacities.windPeakMW - GAME_CONFIG.assets.renewable.rampMWPerSecond);
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

  it("makes dam fill visibly store surplus and reduce delivered supply", () => {
    const player = createInitialPlayerState("player");
    const hold = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: { ...player.controls, waterDamMode: "hold" },
      currentDemandMW: 1,
      dt: 1,
      solarFactor: 1,
      windKmh: 35,
    });
    const fill = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: { ...player.controls, waterDamMode: "fill" },
      currentDemandMW: 1,
      dt: 1,
      solarFactor: 1,
      windKmh: 35,
    });

    expect(fill.outputs.storedWaterMWh).toBeGreaterThan(player.runtime.storedWaterMWh + 0.1);
    expect(fill.outputs.damAbsorbMW).toBeGreaterThan(0);
    expect(fill.outputs.deliveredSupplyMW).toBeLessThan(hold.outputs.deliveredSupplyMW);
  });

  it("makes dam drain visibly spend storage and add production", () => {
    const player = createInitialPlayerState("player");
    const hold = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: { ...player.controls, waterDamMode: "hold", windEnabled: false },
      currentDemandMW: 100,
      dt: 1,
      solarFactor: 0,
      windKmh: 0,
    });
    const drain = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: { ...player.controls, waterDamMode: "drain", windEnabled: false },
      currentDemandMW: 100,
      dt: 1,
      solarFactor: 0,
      windKmh: 0,
    });

    expect(drain.outputs.storedWaterMWh).toBeLessThan(player.runtime.storedWaterMWh - 0.1);
    expect(drain.outputs.damOutputMW).toBeGreaterThan(0);
    expect(drain.outputs.deliveredSupplyMW).toBeGreaterThan(hold.outputs.deliveredSupplyMW);
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

  it("rain fills the dam and only auto-drains a small amount when full", () => {
    const player = createInitialPlayerState("player");
    const rainy = updateAssetOutputs({
      capacities: player.capacities,
      runtime: { ...player.runtime, storedWaterMWh: player.capacities.waterDamCapacityMWh },
      controls: { ...player.controls, waterDamMode: "hold" },
      currentDemandMW: 100,
      dt: 1,
      solarFactor: 0,
      windKmh: 0,
      rainActive: true,
    });

    expect(rainy.outputs.damOutputMW).toBeCloseTo(
      player.capacities.waterDamMaxPowerMW * GAME_CONFIG.assets.waterDam.rainAutoDrainPowerRatio,
    );
    expect(rainy.outputs.damOutputMW).toBeLessThan(player.capacities.waterDamMaxPowerMW);
  });
});
