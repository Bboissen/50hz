import { createInitialMatchState, selectDispatchConsoleState, selectProductionConsoleState } from "../../gameplay/match";
import type { DispatchConsoleState, MatchState, PlayerState, ProductionConsoleState } from "../../gameplay/types";

export type ControlDeskPreviewState = {
  match: MatchState;
  dispatch: DispatchConsoleState;
  production: ProductionConsoleState;
};

function withPreviewPlayerValues(player: PlayerState): PlayerState {
  const nuclearOutputMW = player.capacities.nuclearCapacityMW;
  const thermalOutputMW = player.capacities.thermalCapacityMW * 0.38;
  const solarOutputMW = player.capacities.solarPeakMW * 0.68;
  const windOutputMW = player.capacities.windPeakMW * 0.72;
  const currentDemandMW = 82;
  const rawProductionMW = nuclearOutputMW + thermalOutputMW + solarOutputMW + windOutputMW;

  return {
    ...player,
    cash: 126,
    score: 248,
    targetMarketShare: 0.54,
    subscribedLoadShare: 0.48,
    controls: {
      ...player.controls,
      nuclearTargetMW: nuclearOutputMW,
      thermalThrottle: 0.38,
      windEnabled: true,
      waterDamMode: "hold",
    },
    runtime: {
      ...player.runtime,
      nuclearOutputMW,
      thermalHeat: 18,
      storedWaterMWh: player.capacities.waterDamCapacityMWh * 0.58,
    },
    lastEfficiency: 0.92,
    lastPrice: 5.8,
    lastMargin: 0.84,
    lastContractLoadMW: currentDemandMW,
    lastContractCapacityBasisMW: 96,
    lastCurrentDemandMW: currentDemandMW,
    lastSupplyDemandMismatch: (rawProductionMW - currentDemandMW) / currentDemandMW,
    lastCapacityUtilization: currentDemandMW / 96,
    lastOutputs: {
      ...player.lastOutputs,
      nuclearOutputMW,
      thermalOutputMW,
      solarOutputMW,
      windOutputMW,
      damOutputMW: 0,
      damAbsorbMW: 0,
      rawProductionMW,
      deliveredSupplyMW: rawProductionMW,
      thermalHeat: 18,
      storedWaterMWh: player.capacities.waterDamCapacityMWh * 0.58,
    },
  };
}

export function createControlDeskPreviewState(seed = "control-desk-preview"): ControlDeskPreviewState {
  const base = createInitialMatchState({ seed });
  const match: MatchState = {
    ...base,
    timeSeconds: 90,
    players: {
      ...base.players,
      player: withPreviewPlayerValues(base.players.player),
      rival: {
        ...base.players.rival,
        lastEfficiency: 0.78,
        lastPrice: 7.1,
        lastMargin: 0.72,
      },
    },
  };

  return {
    match,
    dispatch: selectDispatchConsoleState(match),
    production: selectProductionConsoleState(match),
  };
}
