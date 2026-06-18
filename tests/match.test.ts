import { describe, expect, it } from "vitest";

import {
  applyPlayerCommand,
  createInitialMatchState,
  selectDispatchConsoleState,
  selectProductionConsoleState,
  tickMatch,
} from "../src/gameplay/match";
import { GAME_CONFIG } from "../src/gameplay/config";

function tickFor(seconds: number) {
  let state = createInitialMatchState();
  for (let elapsed = 0; elapsed < seconds; elapsed += 1) {
    state = tickMatch(state, 1);
  }
  return state;
}

describe("match", () => {
  it("advances time deterministically", () => {
    const state = tickMatch(createInitialMatchState(), 1);

    expect(state.timeSeconds).toBe(1);
  });

  it("triggers expected demo timeline warnings and impacts", () => {
    const warning = tickFor(36);
    const impact = tickFor(43);

    expect(warning.activeEvents.some((event) => event.id === "footballFinal" && event.phase === "warning")).toBe(true);
    expect(impact.activeEvents.some((event) => event.id === "footballFinal" && event.phase === "impact")).toBe(true);
  });

  it("increases cash and score from cash gain", () => {
    const before = createInitialMatchState();
    const after = tickMatch(before, 1);

    expect(after.players.player.cash).toBeGreaterThan(before.players.player.cash);
    expect(after.players.player.score).toBeGreaterThan(before.players.player.score);
  });

  it("buying an upgrade subtracts cash but not score", () => {
    const before = tickMatch(createInitialMatchState(), 1);
    const after = applyPlayerCommand(before, { type: "buyUpgrade", playerId: "player", kind: "thermal" });

    expect(after.players.player.cash).toBeLessThan(before.players.player.cash);
    expect(after.players.player.score).toBe(before.players.player.score);
  });

  it("lets bad manual control create underload pressure", () => {
    let state = createInitialMatchState();
    state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 0 });
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0 });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
    state = tickMatch(state, 2);

    expect(selectDispatchConsoleState(state).supplyDemandMismatch).toBeLessThan(-0.05);
  });

  it("changes nuclear target without snapping current output instantly", () => {
    const before = createInitialMatchState();
    const after = applyPlayerCommand(before, { type: "setNuclearTarget", playerId: "player", targetMW: 5 });

    expect(after.players.player.controls.nuclearTargetMW).toBe(5);
    expect(after.players.player.runtime.nuclearOutputMW).toBe(before.players.player.runtime.nuclearOutputMW);
  });

  it("thermal throttle affects output and heat", () => {
    let state = applyPlayerCommand(createInitialMatchState(), { type: "setThermalThrottle", playerId: "player", throttle: 1 });
    state = tickMatch(state, 1);

    expect(state.players.player.lastOutputs.thermalOutputMW).toBeGreaterThan(0);
    expect(state.players.player.runtime.thermalHeat).toBeGreaterThan(0);
  });

  it("dam drain lowers stored water and wind toggle removes wind contribution", () => {
    let state = createInitialMatchState();
    const initialWater = state.players.player.runtime.storedWaterMWh;
    state = applyPlayerCommand(state, { type: "setWaterDamMode", playerId: "player", mode: "drain" });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
    state = tickMatch(state, 1);

    expect(state.players.player.runtime.storedWaterMWh).toBeLessThan(initialWater);
    expect(state.players.player.lastOutputs.windOutputMW).toBe(0);
  });

  it("load shedding reduces current demand with a downside", () => {
    const baseline = tickMatch(createInitialMatchState(), 1);
    let shed = applyPlayerCommand(createInitialMatchState(), { type: "shedLoad", playerId: "player" });
    shed = tickMatch(shed, 1);

    expect(shed.players.player.lastCurrentDemandMW).toBeLessThan(baseline.players.player.lastCurrentDemandMW);
    expect(shed.players.player.subscribedLoadShare).toBeLessThan(baseline.players.player.subscribedLoadShare);
  });

  it("hold breaker reset only clears after two seconds", () => {
    const base = createInitialMatchState();
    const tripped = {
      ...base,
      players: {
        ...base.players,
        player: {
          ...base.players.player,
          runtime: {
            ...base.players.player.runtime,
            breakerTrippedSeconds: 8,
          },
        },
      },
    };
    const partial = applyPlayerCommand(tripped, { type: "holdBreakerReset", playerId: "player", seconds: 1 });
    const complete = applyPlayerCommand(partial, { type: "holdBreakerReset", playerId: "player", seconds: 1.1 });

    expect(partial.players.player.runtime.breakerTrippedSeconds).toBeGreaterThan(0);
    expect(complete.players.player.runtime.breakerTrippedSeconds).toBe(0);
  });

  it("production selector exposes manual control state", () => {
    const state = tickMatch(createInitialMatchState(), 1);
    const production = selectProductionConsoleState(state);

    expect(production.nuclearTargetMW).toBeGreaterThanOrEqual(0);
    expect(production.thermalOutputMW).toBeGreaterThanOrEqual(0);
    expect(production.waterDamCapacityMWh).toBeGreaterThan(0);
    expect(production.breakerResetProgress).toBeGreaterThanOrEqual(0);
  });

  it("production commands update one shared supply state across panels", () => {
    const baseline = tickMatch(createInitialMatchState(), 1);
    let state = applyPlayerCommand(baseline, { type: "setNuclearTarget", playerId: "player", targetMW: 0 });
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0 });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
    state = tickMatch(state, 2);

    const production = selectProductionConsoleState(state);
    const dispatch = selectDispatchConsoleState(state);

    expect(production.generationMW).toBe(state.players.player.lastOutputs.rawProductionMW);
    expect(dispatch.generationMW).toBe(production.generationMW);
    expect(dispatch.supplyDemandMismatch).toBe(production.supplyDemandMismatch);
    expect(production.generationMW).toBeLessThan(selectProductionConsoleState(baseline).generationMW);
  });

  it("computes balance from controllable generation, not grid-limited delivery", () => {
    let state = createInitialMatchState();
    state = {
      ...state,
      players: {
        ...state.players,
        player: {
          ...state.players.player,
          capacities: {
            ...state.players.player.capacities,
            gridCapacityMW: 10,
          },
        },
      },
    };
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 1 });
    state = tickMatch(state, 1);

    const production = selectProductionConsoleState(state);
    const expectedMismatch = (production.generationMW - production.currentDemandMW) / production.currentDemandMW;

    expect(production.generationMW).toBeGreaterThan(production.deliveredSupplyMW);
    expect(production.supplyDemandMismatch).toBeCloseTo(expectedMismatch);
  });

  it("completed upgrades change capacity basis and are visible in selectors", () => {
    let state = tickMatch(createInitialMatchState(), 1);
    const before = selectProductionConsoleState(state);

    state = applyPlayerCommand(state, { type: "buyUpgrade", playerId: "player", kind: "thermal" });
    const building = selectDispatchConsoleState(state).plants.boiler;

    expect(building.isBuilding).toBe(true);
    expect(building.level).toBe(1);
    expect(building.purchasedLevel).toBe(2);

    state = tickMatch(state, GAME_CONFIG.upgrades.thermal.buildSeconds + 0.1);
    const afterProduction = selectProductionConsoleState(state);
    const afterDispatch = selectDispatchConsoleState(state);

    expect(afterProduction.thermalCapacityMW).toBe(before.thermalCapacityMW + GAME_CONFIG.upgrades.thermal.capacityMW);
    expect(afterDispatch.plants.boiler.level).toBe(2);
    expect(afterDispatch.deterministicMaxCapacityMW).toBeGreaterThan(before.deterministicMaxCapacityMW);
    expect(afterDispatch.contractCapacityBasisMW).toBeGreaterThan(before.contractCapacityBasisMW);
  });

  it("water dam mode affects both storage gauge data and generation output", () => {
    let fill = createInitialMatchState();
    fill = applyPlayerCommand(fill, { type: "setThermalThrottle", playerId: "player", throttle: 1 });
    fill = applyPlayerCommand(fill, { type: "setWaterDamMode", playerId: "player", mode: "fill" });
    fill = tickMatch(fill, 1);

    let drain = createInitialMatchState();
    drain = applyPlayerCommand(drain, { type: "setWaterDamMode", playerId: "player", mode: "drain" });
    drain = applyPlayerCommand(drain, { type: "setWindEnabled", playerId: "player", enabled: false });
    drain = tickMatch(drain, 1);

    const fillProduction = selectProductionConsoleState(fill);
    const drainProduction = selectProductionConsoleState(drain);

    expect(fillProduction.damAbsorbMW).toBeGreaterThan(0);
    expect(fillProduction.storedWaterMWh).toBeGreaterThan(createInitialMatchState().players.player.runtime.storedWaterMWh);
    expect(drainProduction.damOutputMW).toBeGreaterThan(0);
    expect(drainProduction.storedWaterMWh).toBeLessThan(createInitialMatchState().players.player.runtime.storedWaterMWh);
  });
});
