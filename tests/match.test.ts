import { describe, expect, it } from "vitest";

import {
  applyPlayerCommand,
  computeFinalResult,
  createInitialMatchState,
  isMatchOver,
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

function forceUnderloadTrip() {
  let state = createInitialMatchState();
  state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 0 });
  state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0 });
  state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
  return tickMatch(state, 2);
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
    state = tickMatch(state, 0.5);

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
    state = tickMatch(state, 0.5);

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
    const inert = applyPlayerCommand(base, { type: "holdBreakerReset", playerId: "player", seconds: 3 });

    expect(partial.players.player.runtime.breakerTrippedSeconds).toBeGreaterThan(0);
    expect(complete.players.player.runtime.breakerTrippedSeconds).toBe(0);
    expect(inert.players.player.runtime.breakerResetHoldSeconds).toBe(0);
  });

  it("prolonged underload trips the breaker and applies strike penalties", () => {
    let state = createInitialMatchState();
    const beforeCash = state.players.player.cash;
    const beforeScore = state.players.player.score;
    const beforeShare = state.players.player.subscribedLoadShare;
    state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 0 });
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0 });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
    state = tickMatch(state, 2);

    const player = state.players.player;

    expect(player.strikes).toBe(1);
    expect(player.cash).toBeLessThan(beforeCash);
    expect(player.subscribedLoadShare).toBeLessThan(beforeShare);
    expect(player.runtime.lastBreakerReason).toBe("underload");
    expect(beforeScore - player.score).toBeCloseTo(GAME_CONFIG.strike.scorePenalty);
    state = tickMatch(state, 1);
    const waitingDispatch = selectDispatchConsoleState(state);
    expect(waitingDispatch.breakerLifecycle).toBe("awaiting-reset");
    expect(waitingDispatch.breakerResetRequired).toBe(true);
    expect(waitingDispatch.breakerStatusText).toContain("RESET REQUIRED");
    expect(waitingDispatch.lastBreakerTripSummary?.cashPenalty).toBe(GAME_CONFIG.strike.cashPenalty);
    expect(waitingDispatch.lastBreakerTripSummary?.totalScorePenalty).toBe(GAME_CONFIG.strike.scorePenalty);
  });

  it("god mode lets dev supply changes run without tripping the breaker", () => {
    let state = createInitialMatchState();
    state = applyPlayerCommand(state, { type: "setGodMode", playerId: "player", enabled: true });
    state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 0 });
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0 });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
    state = tickMatch(state, 10);

    const dispatch = selectDispatchConsoleState(state);

    expect(state.players.player.strikes).toBe(0);
    expect(dispatch.devGodMode).toBe(true);
    expect(dispatch.breakerTimer).toBe(0);
    expect(dispatch.balanceBreakerTimer).toBe(0);
    expect(dispatch.breakerResetRequired).toBe(false);
    expect(dispatch.breakerStatusText).toContain("GOD MODE");
    expect(dispatch.supplyDemandMismatch).toBeLessThan(-GAME_CONFIG.breaker.safeBalanceBand);
  });

  it("enabling god mode clears an active breaker trip for dev iteration", () => {
    let state = forceUnderloadTrip();
    expect(selectDispatchConsoleState(state).breakerResetRequired).toBe(true);

    state = applyPlayerCommand(state, { type: "setGodMode", playerId: "player", enabled: true });
    const production = selectProductionConsoleState(state);

    expect(production.devGodMode).toBe(true);
    expect(production.breakerResetRequired).toBe(false);
    expect(production.isGridDown).toBe(false);
    expect(state.players.player.runtime.breakerTrippedSeconds).toBe(0);
  });

  it("does not subtract breaker strike penalties a second time from final score", () => {
    const state = forceUnderloadTrip();
    const result = computeFinalResult(state);

    expect(state.players.player.strikes).toBe(1);
    expect(result.playerFinalScore).toBeCloseTo(state.players.player.score);
  });

  it("grid down zeroes plant supply, demand, and served contract split through plant state", () => {
    const state = forceUnderloadTrip();
    const production = selectProductionConsoleState(state);
    const dispatch = selectDispatchConsoleState(state);

    expect(production.isGridDown).toBe(true);
    expect(production.generationMW).toBe(0);
    expect(production.deliveredSupplyMW).toBe(0);
    expect(production.currentDemandMW).toBe(0);
    expect(production.currentContractLoadMW).toBe(0);
    expect(dispatch.playerSubscribedLoadShare).toBe(0);
    expect(dispatch.playerTargetMarketShare).toBe(0);
    expect(Object.values(production.plantStates)).toEqual(["gridDown", "gridDown", "gridDown", "gridDown", "gridDown"]);
    expect(production.nuclearOutputMW).toBe(0);
    expect(production.thermalOutputMW).toBe(0);
    expect(production.solarOutputMW).toBe(0);
    expect(production.windOutputMW).toBe(0);
    expect(production.damOutputMW).toBe(0);
  });

  it("prolonged overload trips the breaker with an overload reason", () => {
    let state = createInitialMatchState();
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 1 });
    state = applyPlayerCommand(state, { type: "setWaterDamMode", playerId: "player", mode: "drain" });
    state = tickMatch(state, 2);

    expect(state.players.player.strikes).toBe(1);
    expect(state.players.player.runtime.lastBreakerReason).toBe("overload");
    expect(selectDispatchConsoleState(state).breakerTripReason).toBe("overload");
  });

  it("does not silently recover after breaker trip without manual reset", () => {
    let state = createInitialMatchState();
    state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 0 });
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0 });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
    state = tickMatch(state, 2);

    const trippedStrikes = state.players.player.strikes;
    state = tickMatch(state, GAME_CONFIG.breaker.breakerTripSeconds + 1);

    expect(state.players.player.runtime.breakerTrippedSeconds).toBeGreaterThan(0);
    expect(state.players.player.runtime.gridShutdownReliefSeconds).toBe(GAME_CONFIG.breaker.gridShutdownReliefSeconds);
    expect(state.players.player.strikes).toBe(trippedStrikes);
    expect(selectProductionConsoleState(state).breakerResetRequired).toBe(true);
  });

  it("manual reset moves through reset progress and recovered lifecycle", () => {
    let state = forceUnderloadTrip();
    const cashAfterTrip = state.players.player.cash;

    state = applyPlayerCommand(state, { type: "holdBreakerReset", playerId: "player", seconds: 1 });
    expect(selectProductionConsoleState(state).breakerLifecycle).toBe("reset-progress");
    expect(selectProductionConsoleState(state).breakerResetProgress).toBeCloseTo(0.5);

    state = applyPlayerCommand(state, { type: "holdBreakerReset", playerId: "player", seconds: 1.1 });
    const production = selectProductionConsoleState(state);

    expect(production.breakerResetRequired).toBe(false);
    expect(production.breakerLifecycle).toBe("recovered");
    expect(production.breakerStatusText).toContain("NETWORK RESET COMPLETE");
    expect(state.players.player.cash).toBeCloseTo(cashAfterTrip - GAME_CONFIG.breaker.resetCost);
    expect(production.gridShutdownReliefSeconds).toBeGreaterThan(0);
  });

  it("post-reset relief matches served contract load to supply for headroom", () => {
    let state = forceUnderloadTrip();
    state = tickMatch(state, GAME_CONFIG.breaker.gridShutdownReliefSeconds + 1);
    state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 35 });
    state = applyPlayerCommand(state, {
      type: "setThermalThrottle",
      playerId: "player",
      throttle: GAME_CONFIG.assets.thermal.initialThrottle,
    });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: true });
    state = applyPlayerCommand(state, { type: "holdBreakerReset", playerId: "player", seconds: 2.1 });
    state = tickMatch(state, 1);

    const production = selectProductionConsoleState(state);

    expect(production.isGridDown).toBe(false);
    expect(production.gridShutdownReliefSeconds).toBeGreaterThan(0);
    expect(production.currentContractLoadMW).toBeCloseTo(production.generationMW);
    expect(production.currentDemandMW).toBeCloseTo(production.generationMW);
    expect(production.supplyDemandMismatch).toBeCloseTo(0);
  });

  it("unaffordable breaker reset ends the match", () => {
    let state = forceUnderloadTrip();
    state = {
      ...state,
      players: {
        ...state.players,
        player: {
          ...state.players.player,
          cash: GAME_CONFIG.breaker.resetCost - 1,
        },
      },
    };
    state = applyPlayerCommand(state, { type: "holdBreakerReset", playerId: "player", seconds: 2.1 });
    const result = computeFinalResult(state);

    expect(state.gameOverReason).toBe("player-reset-bankrupt");
    expect(isMatchOver(state)).toBe(true);
    expect(result.reason).toBe("player-reset-bankrupt");
    expect(result.winner).toBe("rival");
  });

  it("manual correction can drain breaker risk before a trip", () => {
    let state = createInitialMatchState();
    state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 0 });
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0 });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
    state = tickMatch(state, 0.5);

    expect(selectDispatchConsoleState(state).balanceBreakerTimer).toBeGreaterThan(0);

    state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 35 });
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0.5 });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: true });
    state = applyPlayerCommand(state, { type: "setWaterDamMode", playerId: "player", mode: "hold" });
    state = tickMatch(state, 2);

    expect(state.players.player.strikes).toBe(0);
    expect(selectDispatchConsoleState(state).balanceBreakerTimer).toBe(0);
    expect(Math.abs(selectDispatchConsoleState(state).supplyDemandMismatch)).toBeLessThanOrEqual(GAME_CONFIG.breaker.safeBalanceBand);
  });

  it("capacity overrun from stacked fixed contracts trips instantly", () => {
    let state = createInitialMatchState();
    state = {
      ...state,
      players: {
        ...state.players,
        player: {
          ...state.players.player,
          capacities: {
            ...state.players.player.capacities,
            gridCapacityMW: 90,
          },
        },
      },
    };
    state = applyPlayerCommand(state, { type: "acceptContract", playerId: "player", kind: "business" });
    state = applyPlayerCommand(state, { type: "acceptContract", playerId: "player", kind: "dataCenter" });
    state = tickMatch(state, 0.1);

    expect(state.players.player.strikes).toBe(1);
    expect(state.players.player.runtime.lastBreakerReason).toBe("capacity-overload");
    expect(selectDispatchConsoleState(state).lastBreakerTripSummary?.contractScorePenalty).toBeGreaterThan(0);
  });

  it("does not complete and reward a contract on the same tick that trips the breaker", () => {
    let state = createInitialMatchState();
    state = applyPlayerCommand(state, { type: "acceptContract", playerId: "player", kind: "business" });
    state = applyPlayerCommand(state, { type: "setNuclearTarget", playerId: "player", targetMW: 0 });
    state = applyPlayerCommand(state, { type: "setThermalThrottle", playerId: "player", throttle: 0 });
    state = applyPlayerCommand(state, { type: "setWindEnabled", playerId: "player", enabled: false });
    state = {
      ...state,
      players: {
        ...state.players,
        player: {
          ...state.players.player,
          activeContracts: state.players.player.activeContracts.map((contract) => ({ ...contract, remainingSeconds: 0.1 })),
        },
      },
    };
    const before = state.players.player;
    state = tickMatch(state, 2);

    const player = state.players.player;
    const expectedPenalty = GAME_CONFIG.strike.scorePenalty + GAME_CONFIG.contracts.business.strikeScorePenalty;

    expect(player.strikes).toBe(1);
    expect(player.activeContracts).toHaveLength(1);
    expect(player.cash).toBeCloseTo(before.cash - GAME_CONFIG.strike.cashPenalty);
    expect(player.score).toBeCloseTo(before.score - expectedPenalty);
    expect(player.runtime.lastBreakerTripSummary?.contractScorePenalty).toBe(GAME_CONFIG.contracts.business.strikeScorePenalty);
    expect(player.runtime.lastBreakerTripSummary?.totalScorePenalty).toBe(expectedPenalty);
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

  it("grid capacity overrun trips to grid down instead of hiding behind delivered supply", () => {
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
    state = tickMatch(state, 0.1);

    const production = selectProductionConsoleState(state);

    expect(state.players.player.runtime.lastBreakerReason).toBe("capacity-overload");
    expect(production.isGridDown).toBe(true);
    expect(production.generationMW).toBe(0);
    expect(production.deliveredSupplyMW).toBe(0);
    expect(production.currentDemandMW).toBe(0);
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

    expect(afterProduction.thermalCapacityMW).toBe(GAME_CONFIG.assets.plantLevels.thermalMW[1]);
    expect(afterDispatch.plants.boiler.level).toBe(2);
    expect(afterDispatch.deterministicMaxCapacityMW).toBeGreaterThan(before.deterministicMaxCapacityMW);
    expect(afterDispatch.contractCapacityBasisMW).toBeGreaterThan(before.contractCapacityBasisMW);
  });

  it("water dam mode affects both storage gauge data and generation output", () => {
    let fill = createInitialMatchState();
    fill = applyPlayerCommand(fill, { type: "setThermalThrottle", playerId: "player", throttle: 1 });
    fill = applyPlayerCommand(fill, { type: "setWaterDamMode", playerId: "player", mode: "fill" });
    fill = tickMatch(fill, 0.5);

    let drain = createInitialMatchState();
    drain = applyPlayerCommand(drain, { type: "setWaterDamMode", playerId: "player", mode: "drain" });
    drain = applyPlayerCommand(drain, { type: "setWindEnabled", playerId: "player", enabled: false });
    drain = tickMatch(drain, 0.5);

    const fillProduction = selectProductionConsoleState(fill);
    const drainProduction = selectProductionConsoleState(drain);

    expect(fillProduction.damAbsorbMW).toBeGreaterThan(0);
    expect(fillProduction.storedWaterMWh).toBeGreaterThan(createInitialMatchState().players.player.runtime.storedWaterMWh);
    expect(drainProduction.damOutputMW).toBeGreaterThan(0);
    expect(drainProduction.storedWaterMWh).toBeLessThan(createInitialMatchState().players.player.runtime.storedWaterMWh);
  });
});
