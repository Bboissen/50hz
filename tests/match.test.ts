import { describe, expect, it } from "vitest";

import { applyPlayerCommand, createInitialMatchState, selectDispatchConsoleState, tickMatch } from "../src/gameplay/match";

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
});
