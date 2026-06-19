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

    expect(result.outputs.solarOutputMW).toBe(player.capacities.solarPeakMW / GAME_CONFIG.assets.renewable.rampSeconds);
    expect(result.outputs.windOutputMW).toBe(player.capacities.windPeakMW / GAME_CONFIG.assets.renewable.rampSeconds);
    expect(result.outputs.solarOutputMW).toBeLessThan(player.capacities.solarPeakMW);
    expect(result.outputs.windOutputMW).toBeLessThan(player.capacities.windPeakMW);
  });

  it("exposes the same renewable potential that solar and wind ramp toward", () => {
    const player = createInitialPlayerState("player");
    const halfSun = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: player.controls,
      currentDemandMW: 70,
      dt: 1,
      solarFactor: 0.5,
      windKmh: GAME_CONFIG.assets.renewable.windFullPowerKmh,
    });
    const fullSun = updateAssetOutputs({
      capacities: player.capacities,
      runtime: halfSun.runtime,
      controls: player.controls,
      currentDemandMW: 70,
      dt: 1,
      solarFactor: 1,
      windKmh: GAME_CONFIG.assets.renewable.windFullPowerKmh,
    });

    expect(halfSun.outputs.solarPotentialMW).toBe(player.capacities.solarPeakMW * 0.5);
    expect(halfSun.outputs.windPotentialMW).toBe(player.capacities.windPeakMW);
    expect(halfSun.outputs.solarOutputMW).toBeLessThanOrEqual(halfSun.outputs.solarPotentialMW);
    expect(fullSun.outputs.solarPotentialMW).toBe(player.capacities.solarPeakMW);
    expect(fullSun.outputs.solarOutputMW).toBe(fullSun.outputs.solarPotentialMW);
    expect(fullSun.outputs.solarOutputMW).toBeGreaterThan(halfSun.outputs.solarOutputMW);
  });

  it("scales renewable ramp speed so upgraded plants reach peak within the response window", () => {
    const player = createInitialPlayerState("player");
    const capacities = {
      ...player.capacities,
      solarPeakMW: GAME_CONFIG.assets.plantLevels.renewablePeakMW[2] * GAME_CONFIG.assets.renewable.solarShare,
      windPeakMW: GAME_CONFIG.assets.plantLevels.renewablePeakMW[2] * GAME_CONFIG.assets.renewable.windShare,
    };
    const result = updateAssetOutputs({
      capacities,
      runtime: player.runtime,
      controls: player.controls,
      currentDemandMW: 70,
      dt: GAME_CONFIG.assets.renewable.rampSeconds,
      solarFactor: 1,
      windKmh: GAME_CONFIG.assets.renewable.windFullPowerKmh,
    });

    expect(result.outputs.solarOutputMW).toBe(capacities.solarPeakMW);
    expect(result.outputs.windOutputMW).toBe(capacities.windPeakMW);
  });

  it("caps solar output immediately when weather reduces panel potential", () => {
    const player = createInitialPlayerState("player");

    for (const solarFactor of [0.55, 0.35, 0.25]) {
      const result = updateAssetOutputs({
        capacities: player.capacities,
        runtime: {
          ...player.runtime,
          solarOutputMW: player.capacities.solarPeakMW,
        },
        controls: player.controls,
        currentDemandMW: 70,
        dt: 1 / GAME_CONFIG.match.tickRateHz,
        solarFactor,
        windKmh: GAME_CONFIG.assets.renewable.windFullPowerKmh,
      });

      expect(result.outputs.solarPotentialMW).toBeCloseTo(player.capacities.solarPeakMW * solarFactor);
      expect(result.outputs.solarOutputMW).toBeCloseTo(result.outputs.solarPotentialMW);
    }
  });

  it("caps solar immediately on weather loss while wind routing still ramps down", () => {
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

    expect(result.outputs.solarOutputMW).toBe(0);
    expect(result.outputs.windOutputMW).toBe(
      player.capacities.windPeakMW - player.capacities.windPeakMW / GAME_CONFIG.assets.renewable.rampSeconds,
    );
  });

  it("ramps water dam drain output up and down instead of snapping", () => {
    const player = createInitialPlayerState("player");
    const rampUp = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: { ...player.controls, waterDamMode: "drain", windEnabled: false },
      currentDemandMW: 100,
      dt: 1,
      solarFactor: 0,
      windKmh: 0,
    });
    const rampDown = updateAssetOutputs({
      capacities: player.capacities,
      runtime: rampUp.runtime,
      controls: { ...player.controls, waterDamMode: "hold", windEnabled: false },
      currentDemandMW: 100,
      dt: 1,
      solarFactor: 0,
      windKmh: 0,
    });

    expect(rampUp.outputs.damOutputMW).toBe(GAME_CONFIG.assets.waterDam.drainRampMWPerSecond);
    expect(rampUp.outputs.damOutputMW).toBeLessThan(
      player.capacities.waterDamMaxPowerMW * GAME_CONFIG.assets.waterDam.drainEfficiency,
    );
    expect(rampDown.outputs.damOutputMW).toBe(0);
  });

  it("ramps water dam fill absorption up and down instead of snapping", () => {
    const player = createInitialPlayerState("player");
    const rampUp = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: { ...player.controls, thermalThrottle: 1, waterDamMode: "fill" },
      currentDemandMW: 1,
      dt: 1,
      solarFactor: 1,
      windKmh: GAME_CONFIG.assets.renewable.windFullPowerKmh,
    });
    const rampDown = updateAssetOutputs({
      capacities: player.capacities,
      runtime: rampUp.runtime,
      controls: { ...player.controls, thermalThrottle: 1, waterDamMode: "hold" },
      currentDemandMW: 1,
      dt: 1,
      solarFactor: 1,
      windKmh: GAME_CONFIG.assets.renewable.windFullPowerKmh,
    });

    expect(rampUp.outputs.damAbsorbMW).toBe(player.capacities.waterDamMaxPowerMW);
    expect(GAME_CONFIG.assets.waterDam.fillRampMWPerSecond).toBeGreaterThan(
      GAME_CONFIG.assets.waterDam.drainRampMWPerSecond,
    );
    expect(rampDown.outputs.damAbsorbMW).toBe(0);
  });

  it("lets dam fill actively consume power even without surplus", () => {
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
    const fill = updateAssetOutputs({
      capacities: player.capacities,
      runtime: player.runtime,
      controls: { ...player.controls, waterDamMode: "fill", windEnabled: false },
      currentDemandMW: 100,
      dt: 1,
      solarFactor: 0,
      windKmh: 0,
    });

    expect(fill.outputs.damAbsorbMW).toBe(player.capacities.waterDamMaxPowerMW);
    expect(fill.outputs.deliveredSupplyMW).toBeLessThan(hold.outputs.deliveredSupplyMW);
    expect(fill.outputs.storedWaterMWh).toBeGreaterThan(player.runtime.storedWaterMWh);
  });

  it("does not let dam fill create negative generation or supply", () => {
    const player = createInitialPlayerState("player");
    const result = updateAssetOutputs({
      capacities: player.capacities,
      runtime: {
        ...player.runtime,
        nuclearOutputMW: 0,
        solarOutputMW: 0,
        windOutputMW: 0,
      },
      controls: { ...player.controls, nuclearTargetMW: 0, thermalThrottle: 0, waterDamMode: "fill", windEnabled: false },
      currentDemandMW: 100,
      dt: 1,
      solarFactor: 0,
      windKmh: 0,
    });

    expect(result.outputs.damAbsorbMW).toBe(0);
    expect(result.outputs.rawProductionMW).toBe(0);
    expect(result.outputs.deliveredSupplyMW).toBe(0);
    expect(result.outputs.storedWaterMWh).toBe(player.runtime.storedWaterMWh);
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

  it("makes dam fill visibly store water and reduce delivered supply", () => {
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
