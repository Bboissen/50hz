import { describe, expect, it } from "vitest";

import {
  applyPlayerCommand,
  createInitialMatchState,
  selectDispatchConsoleState,
  selectProductionConsoleState,
  tickMatch,
} from "../src/gameplay/match";

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
});
